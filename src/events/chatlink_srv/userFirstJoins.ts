import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const userFirstJoins: EventData = {
	name: 'userFirstJoins',
	runType: 'always',
	async execute(client: Client, event: PlayerEvent) {
		try {
			await toDiscord(event);
		} catch (error) {
			logger.error('UserFirstJoins', `Error processing user first joins event: ${error}`);
		}
	},
};

export default userFirstJoins;
