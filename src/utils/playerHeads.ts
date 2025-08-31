const CRAFATAR_URL = (uuid: string) => `https://crafatar.com/renders/head/${uuid}?size=5&overlay=true`;
const USERNAME_LOOKUP_URL = (username: string) => `https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(username)}`;
const STEAM_API_URL = (steam64: string) => `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamAPIKey}&steamids=${steam64}`;

import fs from 'fs';
import path from 'path';

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
	const res = await fetch(CRAFATAR_URL(uuid));
	if (!res.ok) throw new Error('Failed to fetch head image');
	const arrayBuffer = await res.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	fs.writeFileSync(filePath, buffer);
	return buffer;
}

// Download Steam avatar and save to cache
async function downloadSteamAvatar(steam64: string, filePath: string) {
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
export async function getMCHead(username: string) {
	let uuid;
	try {
		uuid = await getUUID(username);
	} catch (err) {
		return placeholderPath;
	}
	const filePath = path.join(minecraftCacheDir, `minecraft:${username}.png`);

	// Get the head
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
