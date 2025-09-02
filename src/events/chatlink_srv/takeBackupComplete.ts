import { StateChangeEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { delJson, getJson } from '../../utils/redisHelpers';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { msToHuman } from '../../utils/utils';
import { Client } from 'discord.js';

const takeBackupComplete: EventData = {
	name: 'takeBackupComplete',
	runType: 'always',
	async execute(client: Client, event: StateChangeEvent) {
		const backupTimer = (await getJson(redis, `backupTimer:${event.InstanceId}`)) as { time: number };

		if (backupTimer) {
			const duration = Date.now() - backupTimer.time;
			const timeTook = msToHuman(duration);
			if (timeTook) {
				event.Message += `\n-# Took: ${timeTook.join(' ')}`;
			}
			delJson(redis, `backupTimer:${event.InstanceId}`);
		}

		await toDiscord(event);
	},
};

export default takeBackupComplete;
