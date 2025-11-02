import { playerSchema } from '../../types/apiTypes/serverEventTypes';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { toDiscordTimestamp } from '../discord/timestampGenerator';
import { getKeys, setJson, getJson, TTL } from '../redisHelpers';
import redis from '../../loaders/database/redisLoader';
import { msToHuman } from '../utils';

export async function markAllPlayersOffline(instanceId: string): Promise<void> {
	try {
		const players: playerSchema[] | null = await getKeys(redis, `playerdata:${instanceId}:*`);
		if (players) {
			for (const player of players) {
				const event: PlayerEvent = {
					InstanceId: instanceId,
					Username: player.Username,
					UserId: player.userId,
					Message: '',
					EventId: '',
				};
				await updatePlayerState(event, 'Update');
			}
		}
	} catch (error) {
		throw error;
	}
}

export async function updatePlayerState(event: PlayerEvent, eventType: 'Join' | 'Leave' | 'Update' | 'Tick'): Promise<string> {
	const instanceId = event.InstanceId;
	const username = event.Username;
	const now = Date.now();

	const oldData = (await getJson(redis, `playerdata:${instanceId}:${username}`)) as playerSchema | null;
	let messageModifier = '';
	let userData: playerSchema | undefined;

	switch (eventType) {
		case 'Join': {
			const convertedLast = oldData ? new Date(oldData.lastSeen) : null;
			const lastSeen = convertedLast ? toDiscordTimestamp(convertedLast, 'R') : '';
			messageModifier += lastSeen.length ? `\n-# Last seen: ${lastSeen}` : '\n-# This is their first time joining.';

			const totalPlaytimeMs = oldData?.totalPlaytimeMs || 0;
			const firstSeen = oldData?.firstSeen || now;
			const lastJoin = oldData?.isPlaying ? oldData.lastJoin : now;

			userData = {
				isPlaying: true,
				Username: username,
				userId: event.UserId || oldData?.userId || '',
				lastJoin,
				lastSeen: now,
				firstSeen,
				totalPlaytimeMs,
			};
			break;
		}
		case 'Leave': {
			if (oldData) {
				const duration = now - oldData.lastJoin;
				const timePlayed = msToHuman(duration);
				messageModifier += timePlayed.length ? `\n-# Played for ${timePlayed.join(' ')}` : '';
				let totalPlaytime = oldData.totalPlaytimeMs || 0;
				if (oldData.totalPlaytimeMs) {
					totalPlaytime = oldData.totalPlaytimeMs + duration;
					const totalTimePlayed = msToHuman(totalPlaytime);
					messageModifier += totalTimePlayed.length ? `\n-# Total time played ${totalTimePlayed.join(' ')}` : '';
				}
				userData = {
					...oldData,
					isPlaying: false,
					lastSeen: now,
					totalPlaytimeMs: totalPlaytime,
				};
			}
			break;
		}
		case 'Update': {
			if (oldData) {
				if (!oldData.isPlaying) {
					return '';
				}
				const duration = now - oldData.lastJoin;
				const totalPlaytime = (oldData.totalPlaytimeMs || 0) + duration;
				userData = {
					...oldData,
					isPlaying: false,
					lastSeen: now,
					totalPlaytimeMs: totalPlaytime,
				};
			}
			break;
		}
		case 'Tick': {
			if (oldData && oldData.isPlaying) {
				const now = Date.now();
				const duration = now - oldData.lastJoin;
				const totalPlaytime = (oldData.totalPlaytimeMs || 0) + duration;
				userData = {
					...oldData,
					lastSeen: now,
					totalPlaytimeMs: totalPlaytime,
					lastJoin: now,
				};
			}
			break;
		}
		default:
			return '';
	}

	if (userData) {
		await setJson(redis, `playerdata:${instanceId}:${username}`, userData, '$', TTL(30, 'Days'));
	}
	return messageModifier;
}
