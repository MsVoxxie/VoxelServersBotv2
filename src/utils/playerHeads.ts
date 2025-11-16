const CRAFATAR_URL = (uuid: string) => `https://crafatar.com/renders/head/${uuid}?scale=10&overlay`;
const USERNAME_LOOKUP_URL = (username: string) => `https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(username)}`;
const STEAM_API_URL = (steam64: string) => `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamAPIKey}&steamids=${steam64}`;

import fs from 'fs';
import path from 'path';
import logger from './logger';

// Set cache location and TTL (in milliseconds)
const placeholderPath = path.join(process.cwd(), 'src', 'server', 'public', 'playerAvatars', 'placeholder.png');
const minecraftCacheDir = path.join(process.cwd(), 'src', 'server', 'public', 'playerAvatars', 'Minecraft');
const steamCacheDir = path.join(process.cwd(), 'src', 'server', 'public', 'playerAvatars', 'Steam');
const steamAPIKey = process.env.STEAM_API_KEY;
const CACHE_TTL = 1000 * 60 * 60 * 48; // 48 hours

if (!fs.existsSync(minecraftCacheDir)) fs.mkdirSync(minecraftCacheDir);
if (!fs.existsSync(steamCacheDir)) fs.mkdirSync(steamCacheDir);

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

// Check if a file is fresh (not older than TTL)
function isCacheFresh(filePath: string, ttl = CACHE_TTL) {
	if (!fs.existsSync(filePath)) return false;
	const stats = fs.statSync(filePath);
	const age = Date.now() - stats.mtimeMs;
	return age < ttl;
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

// Download Steam avatar and save to cache
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

// Main function: Get head from cache or fetch it
export async function getMCHead(usernameOrUUID: string) {
	let uuid: string;
	// If input looks like a UUID, use it directly
	if (/^[a-fA-F0-9]{32}$/.test(usernameOrUUID.replace(/-/g, ''))) {
		uuid = usernameOrUUID.replace(/-/g, '');
	} else {
		try {
			uuid = await getUUID(usernameOrUUID);
		} catch (err) {
			return placeholderPath;
		}
	}
	const filePath = path.join(minecraftCacheDir, `minecraft:${usernameOrUUID}.png`);

	try {
		if (!isCacheFresh(filePath)) {
			await downloadHead(uuid, filePath);
		}
		return filePath;
	} catch (err) {
		return placeholderPath;
	}
}

// Main function: Get Steam avatar from cache or fetch it
export async function getSteamAvatar(steam64: string) {
	const filePath = path.join(steamCacheDir, `${steam64}.png`);
	if (!isCacheFresh(filePath)) {
		try {
			await downloadSteamAvatar(steam64, filePath);
		} catch (err) {
			return placeholderPath;
		}
	}
	return filePath;
}
