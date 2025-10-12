import { playerSchema } from '../../types/apiTypes/serverEventTypes';
import redis from '../../loaders/database/redisLoader';
import { getJson, getKeys, setJson, TTL } from '../redisHelpers';
import { msToHuman } from '../utils';
import { toDiscordTimestamp } from '../discord/timestampGenerator';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';

export function markAllPlayersOffline(instanceId: string): Promise<void> {
	return new Promise(async (resolve, reject) => {
		try {
			const players: playerSchema[] | null = await getKeys(redis, `playerdata:${instanceId}:*`);
			if (players) {
				for (const player of players) {
					if (!player.isPlaying) {
						const totalPlaytime = (player.totalPlaytimeMs || 0) + (Date.now() - player.lastJoin || 0);
						player.totalPlaytimeMs = totalPlaytime;
						player.lastSeen = Date.now();
					}
					player.isPlaying = false;
					await setJson(redis, `playerdata:${instanceId}:${player.Username}`, player, '$', TTL(30, 'Days'));
				}
			}
			resolve();
		} catch (error) {
			reject(error);
		}
	});
}

export function handlePlayerJoin(instanceId: string, event: PlayerEvent): Promise<string> {
	return new Promise(async (resolve, reject) => {
		if (!event.Username || event.Username.length === 0) return resolve('');
		if (event.Username === 'SERVER') return resolve('');
		try {
			let messageModifier: string = '';
			const oldData = (await getJson(redis, `playerdata:${instanceId}:${event.Username}`)) as playerSchema;
			if (!oldData) messageModifier = `\n-# This is their first time joining.`;

			const convertedLast = oldData ? new Date(oldData.lastSeen) : null;
			const lastSeen = convertedLast ? toDiscordTimestamp(convertedLast, 'R') : '';
			if (lastSeen.length) messageModifier += `\n-# Last seen: ${lastSeen}`;

			const now = Date.now();
			let totalPlaytimeMs = oldData?.totalPlaytimeMs || 0;
			const firstSeen = oldData?.firstSeen || now;

			const userData: playerSchema = {
				isPlaying: true,
				Username: event.Username,
				userId: event.UserId || oldData?.userId || '',
				lastJoin: now,
				lastSeen: now,
				firstSeen,
				totalPlaytimeMs,
			};
			await setJson(redis, `playerdata:${instanceId}:${event.Username}`, userData, '$', TTL(30, 'Days'));
			resolve(messageModifier);
		} catch (error) {
			reject(error);
		}
	});
}

export function handlePlayerLeave(instanceId: string, event: PlayerEvent): Promise<string> {
	return new Promise(async (resolve, reject) => {
		if (!event.Username || event.Username.length === 0) return resolve('');
		if (event.Username === 'SERVER') return resolve('');
		try {
			let messageModifier: string = '';
			const oldData = (await getJson(redis, `playerdata:${instanceId}:${event.Username}`)) as playerSchema;

			if (oldData) {
				const duration = Date.now() - oldData.lastJoin;
				const timePlayed = msToHuman(duration);
				if (timePlayed.length) messageModifier += `\n-# Played for: ${timePlayed.join(' ')}`;
				if (oldData.totalPlaytimeMs) {
					const totalTimePlayed = msToHuman(oldData.totalPlaytimeMs + duration);
					if (totalTimePlayed.length) messageModifier += `\n-# Total playtime: ${totalTimePlayed.join(' ')}`;
				}
			}

			const now = Date.now();
			const totalPlaytime = (oldData.totalPlaytimeMs || 0) + (now - oldData.lastJoin || 0);
			oldData.totalPlaytimeMs = totalPlaytime;
			oldData.lastSeen = now;
			oldData.isPlaying = false;
			await setJson(redis, `playerdata:${instanceId}:${event.Username}`, oldData, '$', TTL(30, 'Days'));
			resolve(messageModifier);
		} catch (error) {
			reject(error);
		}
	});
}
