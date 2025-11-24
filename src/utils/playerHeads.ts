// const MINECRAFT_HEAD_URL = (uuid: string) => `https://mc-heads.net/head/${uuid}/128`;
const MINECRAFT_HEAD_URL = (uuidDashed: string) => `https://api.mcheads.org/avatar/${uuidDashed}/128`;
const CRAFATAR_HEAD_URL = (uuidUndashed: string) => `https://crafatar.com/avatars/${uuidUndashed}?size=128&overlay`;
const USERNAME_LOOKUP_URL = (username: string) => `https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(username)}`;
const STEAM_API_URL = (steam64: string) => `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamAPIKey}&steamids=${steam64}`;

import fs from 'fs';
import path from 'path';
import logger from './logger';
import { formatMCUUID } from './utils';

// Set cache location and TTL (in milliseconds)
const placeholderPath = path.join(process.cwd(), 'src', 'server', 'public', 'playerAvatars', 'placeholder.png');
const minecraftCacheDir = path.join(process.cwd(), 'src', 'server', 'public', 'playerAvatars', 'Minecraft');
const steamCacheDir = path.join(process.cwd(), 'src', 'server', 'public', 'playerAvatars', 'Steam');
const steamAPIKey = process.env.STEAM_API_KEY;
const CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours

if (!fs.existsSync(minecraftCacheDir)) fs.mkdirSync(minecraftCacheDir);
if (!fs.existsSync(steamCacheDir)) fs.mkdirSync(steamCacheDir);

// Get UUID from username
async function getUUID(username: string) {
	const res = await fetch(USERNAME_LOOKUP_URL(username), {
		headers: { 'Content-Type': 'application/json' },
	});
	if (!res.ok) throw new Error('Failed to fetch UUID');
	const data = await res.json();
	return data.id;
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
	if (uuid === undefined) return logger.error('downloadHead', 'UUID is undefined, cannot download head image');
	const res = await fetch(MINECRAFT_HEAD_URL(uuid));
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
	if (!res.ok) throw new Error('Failed to fetch Steam profile');
	const data = await res.json();
	const player = data.response.players[0];
	if (!player || !player.avatarfull) throw new Error('No avatar found for this SteamID');
	const avatarRes = await fetch(player.avatarfull);
	if (!avatarRes.ok) throw new Error('Failed to fetch avatar image');
	const arrayBuffer = await avatarRes.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	fs.writeFileSync(filePath, buffer);
	return buffer;
}

// Sanitize file name by replacing invalid characters with underscores
function sanitizeFileName(name: string) {
	return name.replace(/[:\/\\\s]/g, '_');
}

function isUUID(v: string) {
	const hex = v.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
	return /^[0-9a-f]{32}$/.test(hex);
}
function undash(v: string) {
	return v.replace(/-/g, '').toLowerCase();
}
function dashUUID(hex: string) {
	return hex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}

async function fetchUUIDForName(name: string): Promise<string | null> {
	try {
		const res = await fetch(USERNAME_LOOKUP_URL(name), { headers: { 'Content-Type': 'application/json' } });
		if (!res.ok) {
			logger.warn('getMCHead', `UUID lookup HTTP ${res.status} for ${name}`);
			return null;
		}
		const data = await res.json();
		if (data?.id && isUUID(data.id)) return undash(data.id);
		return null;
	} catch (e) {
		logger.warn('getMCHead', `UUID lookup error for ${name}: ${(e as Error).message}`);
		return null;
	}
}

async function downloadHeadMulti(uuidUndashed: string, filePath: string) {
	const candidates = [
		{ url: MINECRAFT_HEAD_URL(dashUUID(uuidUndashed)), label: 'mcheads' },
		// { url: CRAFATAR_HEAD_URL(uuidUndashed), label: 'crafatar' },
	];
	for (const c of candidates) {
		try {
			const res = await fetch(c.url);
			if (!res.ok) {
				logger.warn('getMCHead', `Provider ${c.label} status ${res.status} for ${uuidUndashed}`);
				continue;
			}
			const buf = Buffer.from(await res.arrayBuffer());
			fs.writeFileSync(filePath, buf);
			logger.info('getMCHead', `Downloaded from ${c.label} for ${dashUUID(uuidUndashed)}`);
			return;
		} catch (e) {
			logger.warn('getMCHead', `Provider ${c.label} error for ${uuidUndashed}: ${(e as Error).message}`);
		}
	}
	throw new Error('All providers failed');
}

// Main function: Get head from cache or fetch it
export async function getMCHead(id: string) {
	const raw = id.trim();
	let uuidUndashed: string | null = null;

	if (isUUID(raw)) {
		uuidUndashed = undash(raw);
	} else {
		uuidUndashed = await fetchUUIDForName(raw);
	}

	if (!uuidUndashed) {
		logger.warn('getMCHead', `No UUID for ${raw}`);
		return placeholderPath;
	}

	const cachePath = path.join(minecraftCacheDir, `minecraft-${uuidUndashed}.png`);
	try {
		if (!isCacheFresh(cachePath)) {
			await downloadHeadMulti(uuidUndashed, cachePath);
		}
		return cachePath;
	} catch (e) {
		logger.error('getMCHead', `Failed all providers for ${dashUUID(uuidUndashed)}: ${(e as Error).message}`);
		return placeholderPath;
	}
}

// Main function: Get Steam avatar from cache or fetch it
export async function getSteamAvatar(steam64: string) {
	const filePath = path.join(steamCacheDir, `${sanitizeFileName(steam64)}.png`);
	if (!isCacheFresh(filePath)) {
		try {
			await downloadSteamAvatar(steam64, filePath);
			logger.info('getSteamAvatar', `Downloaded new Steam avatar for ${steam64}`);
		} catch (err) {
			logger.error('getSteamAvatar', `Failed to get Steam avatar for ${steam64}\nUsing placeholder image.`);
			return placeholderPath;
		}
	}
	logger.info('getSteamAvatar', `Serving cached Steam avatar for ${steam64}`);
	return filePath;
}
