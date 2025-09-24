import { StateChangeEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { setJson } from '../../utils/redisHelpers';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const userJoins: EventData = {
	name: 'userJoins',
	runType: 'always',
	async execute(client: Client, event: StateChangeEvent) {
		try {
			await toDiscord(event);
			const joinTime = Date.now();
			setJson(redis, `joinDuration:${event.InstanceId}:${event.Username}`, { time: joinTime }, '$', 60 * 60 * 48); // 2 day expiry
		} catch (error) {
			logger.error('UserJoins', `Error processing user joins event: ${error}`);
		}
	},
};

export default userJoins;
