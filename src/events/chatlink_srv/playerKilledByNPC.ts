import { StateChangeEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import { Client } from 'discord.js';

const playerKilledByNPC: EventData = {
	name: 'playerKilledByNPC',
	runType: 'always',
	async execute(client: Client, event: StateChangeEvent) {
		await toDiscord(event);
	},
};

export default playerKilledByNPC;
