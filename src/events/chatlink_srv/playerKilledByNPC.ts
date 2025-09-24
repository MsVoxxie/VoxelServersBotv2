import { KillEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const playerKilledByNPC: EventData = {
	name: 'playerKilledByNPC',
	runType: 'always',
	async execute(client: Client, event: KillEvent) {
		try {
			await toDiscord(event);
		} catch (error) {
			logger.error('PlayerKilledByNPC', `Error processing player killed by NPC event: ${error}`);
		}
	},
};

export default playerKilledByNPC;
