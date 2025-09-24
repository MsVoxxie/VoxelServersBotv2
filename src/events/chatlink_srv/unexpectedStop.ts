import { StateChangeEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const unexpectedStop: EventData = {
	name: 'unexpectedStop',
	runType: 'always',
	async execute(client: Client, event: StateChangeEvent) {
		try {
			await toDiscord(event);
		} catch (error) {
			logger.error('UnexpectedStop', `Error processing unexpected stop event: ${error}`);
		}
	},
};

export default unexpectedStop;
