import { playerSchema } from './../../types/apiTypes/serverEventTypes';
import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { PlayerList, SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { getKeys, setJson, TTL } from '../../utils/redisHelpers';
import logger from '../../utils/logger';

const INTERVAL_MS = 60_000; // 1 minute
const updatePlaytimes: ScheduleTaskData = {
	name: 'Update Playtimes',
	run({ client, redisClient }) {
		const updatePlaytimes = async () => {
			try {
				const now = Date.now();
				const instances = (await getKeys(redisClient, 'instance:*')) as SanitizedInstance[];
				if (!instances || instances.length === 0) return;

				for await (const instance of instances) {
					if (instance.AppState !== 'Running') continue;
					if (instance.Metrics['Active Users'].RawValue === 0) continue;

					const onlinePlayers = instance.Metrics['Active Users'].PlayerList as PlayerList[];
					const allPlayerKeys = await getKeys(redisClient, `playerdata:${instance.InstanceID}:*`);
					if (!onlinePlayers || onlinePlayers.length === 0) continue;
					if (!allPlayerKeys || allPlayerKeys.length === 0) continue;

					for (const player of allPlayerKeys as playerSchema[]) {
						if (onlinePlayers.some((p) => p.Username === player.Username)) {
							// Player is online
							if (!player.isPlaying) {
								player.isPlaying = true;
								player.lastJoin = now;
								await setJson(redisClient, `playerdata:${instance.InstanceID}:${player.Username}`, player, '$', TTL(30, 'Days'));
							}
						} else {
							// Player is offline
							if (player.isPlaying) {
								player.totalPlaytimeMs += now - player.lastJoin;
								player.lastSeen = now;
								player.isPlaying = false;
								await setJson(redisClient, `playerdata:${instance.InstanceID}:${player.Username}`, player, '$', TTL(30, 'Days'));
							}
						}
					}
				}
			} catch (error) {
				logger.error('updatePlaytimes', error instanceof Error ? error.message : String(error));
			}
		};
		updatePlaytimes();
		setInterval(updatePlaytimes, INTERVAL_MS);
	},
};

export default updatePlaytimes;
