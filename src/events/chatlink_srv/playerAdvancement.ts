import { AdvancementEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const playerAdvancement: EventData = {
	name: 'playerAdvancement',
	runType: 'always',
	async execute(client: Client, event: AdvancementEvent) {
		try {
			await toDiscord(event);
		} catch (error) {
			logger.error('PlayerAdvancement', `Error processing player advancement event: ${error}`);
		}
	},
};

export default playerAdvancement;
