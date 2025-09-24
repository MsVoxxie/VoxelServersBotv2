import { BackupEvent } from './../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const backupFailed: EventData = {
	name: 'backupFailed',
	runType: 'always',
	async execute(client: Client, event: BackupEvent) {
		try {
			await toDiscord(event);
		} catch (error) {
			logger.error('BackupFailed', `Error processing backup failed event: ${error}`);
		}
	},
};

export default backupFailed;
