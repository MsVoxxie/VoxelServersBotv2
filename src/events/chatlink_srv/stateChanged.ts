import { StateChangeEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { delJson, getJson, setJson } from '../../utils/redisHelpers';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { msToHuman, wait } from '../../utils/utils';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const stateChanged: EventData = {
	name: 'stateChanged',
	runType: 'always',
	async execute(client: Client, event: StateChangeEvent) {
		try {
			switch (event.Message) {
				case 'Starting':
					const startTime = Date.now();
					setJson(redis, `serverStart:${event.InstanceId}`, { time: startTime }, '$', 60 * 60 * 2); // 2 hours TTL
					await wait(1000); // dirty hack to ensure backup completion event triggers before state change
					break;

				case 'Ready':
					const startDuration = (await getJson(redis, `serverStart:${event.InstanceId}`)) as { time: number };
					const duration = msToHuman(Date.now() - startDuration.time);
					if (duration.length) {
						event.Message += `\n-# Took ${duration.join(' ')}`;
					}
					delJson(redis, `serverStart:${event.InstanceId}`);
					break;
			}

			await toDiscord(event);
		} catch (error) {
			logger.error('StateChanged', `Error processing state changed event: ${error}`);
		}
	},
};

export default stateChanged;
