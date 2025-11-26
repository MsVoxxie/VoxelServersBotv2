import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { setJson, TTL } from '../../utils/redisHelpers';
import { RedisKeys } from '../../types/redisKeys/keys';
import { formatMCUUID } from '../../utils/utils';
import UserData from '../../models/userData';
import logger from '../../utils/logger';
const INTERVAL_MS = 120_000; // 120 seconds

const playerChoiceCache: ScheduleTaskData = {
	name: 'Cache Player Choices',
	run({ client, redisClient }) {
		const runCache = async () => {
			try {
				const chatlinks = await UserData.find().select('-_id -__v').lean();
				const allPlayers = [];
				for (const user of chatlinks) {
					if (user.minecraftUuid) {
						user.minecraftUuid = formatMCUUID(user.minecraftUuid);
					}
					allPlayers.push(user);
				}
				await setJson(redisClient, RedisKeys.playerChoices(), allPlayers, '$', TTL(125, 'Seconds'));
			} catch (error) {
				logger.error('playerCache', error instanceof Error ? error.message : String(error));
			}
		};
		runCache();
		setInterval(runCache, INTERVAL_MS);
	},
};

export default playerChoiceCache;
