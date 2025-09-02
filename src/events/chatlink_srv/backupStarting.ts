import { StateChangeEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { setJson } from '../../utils/redisHelpers';
import { Client } from 'discord.js';

const backupStarting: EventData = {
	name: 'backupStarting',
	runType: 'always',
	async execute(client: Client, event: StateChangeEvent) {
		await toDiscord(event);

		const startTime = Date.now();
		setJson(redis, `backupTimer:${event.InstanceId}`, { time: startTime }, '$', 60 * 60 * 2); // 2 hours TTL
	},
};

export default backupStarting;
