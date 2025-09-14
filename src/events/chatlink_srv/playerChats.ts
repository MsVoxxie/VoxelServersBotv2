import { ChatMessageEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import { Client } from 'discord.js';

const playerChats: EventData = {
	name: 'playerChats',
	runType: 'always',
	async execute(client: Client, event: ChatMessageEvent) {
		await toDiscord(event);
	},
};

export default playerChats;
