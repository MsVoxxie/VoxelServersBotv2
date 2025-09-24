import { LagEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const serverLag: EventData = {
	name: 'serverLag',
	runType: 'always',
	async execute(client: Client, event: LagEvent) {
		try {
			await toDiscord(event);
		} catch (error) {
			logger.error('ServerLag', `Error processing server lag event: ${error}`);
		}
	},
};

export default serverLag;
