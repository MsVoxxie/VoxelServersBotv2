// const MINECRAFT_HEAD_URL = (uuid: string) => `https://mc-heads.net/head/${uuid}/256`;
const MINECRAFT_HEAD_URL = (uuid: string) => `https://avatars.cloudhaven.gg/renders/head/${uuid}?scale=10&overlay`; // Seems offline..
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
			logger.info('getMCHead', `Downloaded new avatar for ${usernameOrUUID}`);
		}
		logger.info('getMCHead', `Serving cached avatar for ${usernameOrUUID}`);
		return filePath;
	} catch (err) {
		logger.error('getMCHead', `Failed to get avatar for ${usernameOrUUID}\nUsing placeholder image.`);
		return placeholderPath;
	}
}

// Main function: Get Steam avatar from cache or fetch it
export async function getSteamAvatar(steam64: string) {
	const filePath = path.join(steamCacheDir, `${steam64}.png`);
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
