import { AdvancementEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import { Client } from 'discord.js';

const playerAdvancement: EventData = {
	name: 'playerAdvancement',
	runType: 'always',
	async execute(client: Client, event: AdvancementEvent) {
		await toDiscord(event);
	},
};

export default playerAdvancement;
