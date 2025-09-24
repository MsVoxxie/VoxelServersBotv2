import { BackupEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const restoreBackupComplete: EventData = {
	name: 'restoreBackupComplete',
	runType: 'always',
	async execute(client: Client, event: BackupEvent) {
		try {
			await toDiscord(event);
		} catch (error) {
			logger.error('RestoreBackupComplete', `Error processing restore backup complete event: ${error}`);
		}
	},
};

export default restoreBackupComplete;
