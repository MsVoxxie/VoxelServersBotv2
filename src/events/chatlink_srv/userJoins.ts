import { updatePlayerState } from '../../utils/gameSpecific/playerData';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const userJoins: EventData = {
	name: 'userJoins',
	runType: 'always',
	async execute(client: Client, event: PlayerEvent) {
		try {
			const msgMod = await updatePlayerState(event, 'Join');
			if (msgMod.length) event.Message += msgMod;

			// Send to Discord
			await toDiscord(event);
		} catch (error) {
			logger.error('UserJoins', `Error processing user joins event: ${error}`);
		}
	},
};

export default userJoins;
