import { KillEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const playerKilledByPlayer: EventData = {
	name: 'playerKilledByPlayer',
	runType: 'always',
	async execute(client: Client, event: KillEvent) {
		try {
			await toDiscord(event);
		} catch (error) {
			logger.error('PlayerKilledByPlayer', `Error processing player killed by player event: ${error}`);
		}
	},
};

export default playerKilledByPlayer;
