import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { delJson, getJson } from '../../utils/redisHelpers';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { msToHuman } from '../../utils/utils';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const userLeaves: EventData = {
	name: 'userLeaves',
	runType: 'always',
	async execute(client: Client, event: PlayerEvent) {
		try {
			const joinData = (await getJson(redis, `joinDuration:${event.InstanceId}:${event.Username}`)) as { time: number };

			if (joinData) {
				const duration = Date.now() - joinData.time;
				const timePlayed = msToHuman(duration);
				if (timePlayed.length) {
					event.Message += `\n-# Played for: ${timePlayed.join(' ')}`;
				}
			}

			await toDiscord(event);
			delJson(redis, `joinDuration:${event.InstanceId}:${event.Username}`);
		} catch (error) {
			logger.error('UserLeaves', `Error processing user leaves event: ${error}`);
		}
	},
};

export default userLeaves;
