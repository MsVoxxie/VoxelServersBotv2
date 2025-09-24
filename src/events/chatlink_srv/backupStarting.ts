import { BackupEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { setJson } from '../../utils/redisHelpers';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const backupStarting: EventData = {
	name: 'backupStarting',
	runType: 'always',
	async execute(client: Client, event: BackupEvent) {
		try {
			await toDiscord(event);
			const startTime = Date.now();
			setJson(redis, `backupTimer:${event.InstanceId}`, { time: startTime }, '$', 60 * 60 * 2); // 2 hours TTL
		} catch (error) {
			logger.error('BackupStarting', `Error processing backup starting event: ${error}`);
		}
	},
};

export default backupStarting;
