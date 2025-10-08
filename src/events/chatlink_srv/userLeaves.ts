import { handlePlayerLeave } from '../../utils/gameSpecific/playerData';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const userLeaves: EventData = {
	name: 'userLeaves',
	runType: 'always',
	async execute(client: Client, event: PlayerEvent) {
		try {
			const msgMod = await handlePlayerLeave(event.InstanceId, event);
			if (msgMod.length) event.Message += msgMod;

			// Send to Discord
			await toDiscord(event);
		} catch (error) {
			logger.error('UserLeaves', `Error processing user leaves event: ${error}`);
		}
	},
};

export default userLeaves;
