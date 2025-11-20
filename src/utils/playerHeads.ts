import fs from 'fs';
import path from 'path';
import logger from './logger';
import { getJson, setJson, TTL } from './redisHelpers';
import redis from '../loaders/database/redisLoader';

const steamAPIKey = process.env.STEAM_API_KEY;

// Validate Steam API key early
if (!steamAPIKey) {
	logger.warn('playerHeads', 'STEAM_API_KEY is not set; Steam avatars will always fall back.');
}

const CRAFATAR_URL = (uuid: string) => `https://crafatar.com/renders/head/${uuid}?scale=10&overlay`;
const USERNAME_LOOKUP_URL = (username: string) => `https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(username)}`;
const STEAM_API_URL = (steam64: string) => `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamAPIKey}&steamids=${steam64}`;

// Set cache location and TTL (in milliseconds)
const placeholderPath = path.join(process.cwd(), 'src', 'server', 'public', 'playerAvatars', 'placeholder.png');
const minecraftCacheDir = path.join(process.cwd(), 'src', 'server', 'public', 'playerAvatars', 'Minecraft');
const steamCacheDir = path.join(process.cwd(), 'src', 'server', 'public', 'playerAvatars', 'Steam');
const CACHE_TTL = 1000 * 60 * 60 * 48; // 48 hours

// Redis TTL: same as CACHE_TTL but in seconds
const REDIS_CACHE_TTL_SECONDS = TTL(48, 'Hours');

if (!fs.existsSync(minecraftCacheDir)) fs.mkdirSync(minecraftCacheDir);
if (!fs.existsSync(steamCacheDir)) fs.mkdirSync(steamCacheDir);

// Redis cache types
interface AvatarCacheEntry {
	// Absolute path to PNG on disk
	filePath: string;
	// ISO timestamp of last refresh
	lastUpdated: string;
	// Optional metadata (e.g., uuid, steam64)
	meta?: Record<string, string>;
}

// Get UUID from username
async function getUUID(username: string) {
	const res = await fetch(USERNAME_LOOKUP_URL(username), {
		headers: { 'Content-Type': 'application/json' },
	});
	if (!res.ok) {
		logger.warn('playerHeads', `UUID lookup failed for ${username}: ${res.status} ${res.statusText}`);
		throw new Error('Failed to fetch UUID');
	}
	const contentType = res.headers.get('content-type') || '';
	if (!contentType.toLowerCase().includes('application/json')) {
		logger.warn('playerHeads', `Unexpected content-type for UUID lookup (${username}): ${contentType}`);
		throw new Error('Invalid response content-type');
	}
	try {
		const data = await res.json();
		return data.id;
	} catch (err) {
		logger.warn('playerHeads', `Failed to parse UUID JSON for ${username}: ${err instanceof Error ? err.message : String(err)}`);
		throw new Error('Failed to parse UUID response');
	}
}

// Download head PNG and save to cache
async function downloadHead(uuid: string, filePath: string) {
	const res = await fetch(CRAFATAR_URL(uuid));
	if (!res.ok) throw new Error('Failed to fetch head image');
	const arrayBuffer = await res.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	fs.writeFileSync(filePath, buffer);
	return buffer;
}

// Convert legacy Steam ID (e.g., STEAM_0:1:61611229) to Steam64
function toSteam64(steamId: string): string {
	if (/^STEAM_\d:\d:\d+$/.test(steamId)) {
		const parts = steamId.split(':');
		const Y = parseInt(parts[1], 10);
		const Z = parseInt(parts[2], 10);
		const steam64 = BigInt('76561197960265728') + BigInt(Z * 2 + Y);
		return steam64.toString();
	}
	return steamId;
}

// Download Steam avatar and save to cache
async function downloadSteamAvatar(steamId: string, filePath: string) {
	const steam64 = toSteam64(steamId);
	const res = await fetch(STEAM_API_URL(steam64));
	if (!res.ok) {
		logger.warn('playerHeads', `Failed Steam profile fetch for ${steamId}: ${res.status} ${res.statusText}`);
		throw new Error('Failed to fetch Steam profile');
	}
	const contentType = res.headers.get('content-type') || '';
	if (!contentType.toLowerCase().includes('application/json')) {
		logger.warn('playerHeads', `Unexpected content-type for Steam profile (${steamId}): ${contentType}`);
		throw new Error('Invalid Steam profile response');
	}
	let data: any;
	try {
		data = await res.json();
	} catch (err) {
		logger.warn('playerHeads', `Failed to parse Steam profile JSON for ${steamId}: ${err instanceof Error ? err.message : String(err)}`);
		throw new Error('Failed to parse Steam profile');
	}
	const player = data.response.players[0];
	if (!player || !player.avatarfull) throw new Error('No avatar found for this SteamID');
	const avatarRes = await fetch(player.avatarfull);
	if (!avatarRes.ok) throw new Error('Failed to fetch avatar image');
	const arrayBuffer = await avatarRes.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	fs.writeFileSync(filePath, buffer);
	return buffer;
}

// Helper: ensure placeholder exists; if not, just return it anyway (Express will 404)
function getSafePlaceholderPath() {
	try {
		if (fs.existsSync(placeholderPath)) return placeholderPath;
	} catch {
		// ignore
	}
	return placeholderPath;
}

async function upsertRedisAvatarCache(key: string, filePath: string, meta?: Record<string, string>) {
	const entry: AvatarCacheEntry = {
		filePath,
		lastUpdated: new Date().toISOString(),
		meta,
	};
	try {
		await setJson(redis, key, entry, '.', REDIS_CACHE_TTL_SECONDS);
	} catch (err) {
		logger.warn('playerHeads', `Failed to upsert Redis avatar cache for ${key}: ${err instanceof Error ? err.message : String(err)}`);
	}
}

async function getRedisAvatarCache(key: string): Promise<AvatarCacheEntry | null> {
	try {
		return await getJson<AvatarCacheEntry>(redis, key, '.');
	} catch (err) {
		logger.warn('playerHeads', `Failed to read Redis avatar cache for ${key}: ${err instanceof Error ? err.message : String(err)}`);
		return null;
	}
}

function isEntryFresh(entry: AvatarCacheEntry, ttlMs = CACHE_TTL): boolean {
	const last = Date.parse(entry.lastUpdated);
	if (Number.isNaN(last)) return false;
	return Date.now() - last < ttlMs;
}

// Fire-and-forget refresh that doesn’t block the response
function triggerBackgroundRefresh(fn: () => Promise<void>) {
	fn().catch((err) => {
		logger.warn('playerHeads', `Background avatar refresh failed: ${err instanceof Error ? err.message : String(err)}`);
	});
}

// Main function: Get head from cache or fetch it (Minecraft)
export async function getMCHead(usernameOrUUID: string) {
	const redisKey = `avatar:minecraft:${usernameOrUUID.toLowerCase()}`;

	let uuid: string;
	if (/^[a-fA-F0-9]{32}$/.test(usernameOrUUID.replace(/-/g, ''))) {
		uuid = usernameOrUUID.replace(/-/g, '');
	} else {
		try {
			uuid = await getUUID(usernameOrUUID);
		} catch (err) {
			logger.warn('playerHeads', `Falling back to placeholder for MC head (UUID lookup failed) ${usernameOrUUID}: ${err instanceof Error ? err.message : String(err)}`);
			return getSafePlaceholderPath();
		}
	}

	const filePathOnDisk = path.join(minecraftCacheDir, `minecraft:${uuid}.png`);

	// 1) Try Redis
	const cached = await getRedisAvatarCache(redisKey);
	if (cached && fs.existsSync(cached.filePath)) {
		if (!isEntryFresh(cached)) {
			triggerBackgroundRefresh(async () => {
				await downloadHead(uuid, filePathOnDisk);
				await upsertRedisAvatarCache(redisKey, filePathOnDisk, { uuid });
			});
		}
		return cached.filePath;
	}

	// 2) Redis miss or no disk file: download now
	try {
		await downloadHead(uuid, filePathOnDisk);
		await upsertRedisAvatarCache(redisKey, filePathOnDisk, { uuid });
		return filePathOnDisk;
	} catch (err) {
		logger.warn('playerHeads', `Falling back to placeholder for MC head (download failed) ${usernameOrUUID}: ${err instanceof Error ? err.message : String(err)}`);
		return getSafePlaceholderPath();
	}
}

// Main function: Get Steam avatar from cache or fetch it
export async function getSteamAvatar(steamIdOr64: string) {
	const steam64 = toSteam64(steamIdOr64);
	const redisKey = `avatar:steam:${steam64}`;
	const filePathOnDisk = path.join(steamCacheDir, `${steam64}.png`);

	// 1) Try Redis
	const cached = await getRedisAvatarCache(redisKey);
	if (cached && fs.existsSync(cached.filePath)) {
		if (!isEntryFresh(cached)) {
			triggerBackgroundRefresh(async () => {
				await downloadSteamAvatar(steam64, filePathOnDisk);
				await upsertRedisAvatarCache(redisKey, filePathOnDisk, { steam64 });
			});
		}
		return cached.filePath;
	}

	// 2) Redis miss or no disk file: download now
	try {
		await downloadSteamAvatar(steam64, filePathOnDisk);
		await upsertRedisAvatarCache(redisKey, filePathOnDisk, { steam64 });
		return filePathOnDisk;
	} catch (err) {
		logger.warn('playerHeads', `Falling back to placeholder for Steam avatar (download failed) ${steamIdOr64}: ${err instanceof Error ? err.message : String(err)}`);
		return getSafePlaceholderPath();
	}
}
