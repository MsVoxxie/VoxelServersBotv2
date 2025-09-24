import { ChatMessageEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const playerChats: EventData = {
	name: 'playerChats',
	runType: 'always',
	async execute(client: Client, event: ChatMessageEvent) {
		try {
			await toDiscord(event);
		} catch (error) {
			logger.error('PlayerChats', `Error processing player chat event: ${error}`);
		}
	},
};

export default playerChats;
