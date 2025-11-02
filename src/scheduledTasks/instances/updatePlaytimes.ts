import { PlayerList, SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { playerSchema } from './../../types/apiTypes/serverEventTypes';
import { getKeys, setJson, TTL } from '../../utils/redisHelpers';
import logger from '../../utils/logger';
import { updatePlayerState } from '../../utils/gameSpecific/playerData';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';

const INTERVAL_MS = 30_000; // 30 seconds
const updatePlaytimes: ScheduleTaskData = {
	name: 'Update Playtimes',
	run({ client, redisClient }) {
		const updatePlaytimes = async () => {
			try {
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
						const event: PlayerEvent = {
							InstanceId: instance.InstanceID,
							Username: player.Username,
							UserId: player.userId,
							Message: '',
							EventId: '',
						};

						if (onlinePlayers.some((p) => p.Username === player.Username)) {
							// Player is online
							await updatePlayerState(event, 'Tick');
						} else {
							// Player is offline
							if (player.isPlaying) {
								await updatePlayerState(event, 'Update');
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
