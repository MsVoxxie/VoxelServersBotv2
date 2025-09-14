import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import { Client } from 'discord.js';

const userFirstJoins: EventData = {
	name: 'userFirstJoins',
	runType: 'always',
	async execute(client: Client, event: PlayerEvent) {
		await toDiscord(event);
	},
};

export default userFirstJoins;
