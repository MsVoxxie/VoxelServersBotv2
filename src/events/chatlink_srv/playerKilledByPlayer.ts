import { KillEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import { Client } from 'discord.js';

const playerKilledByPlayer: EventData = {
	name: 'playerKilledByPlayer',
	runType: 'always',
	async execute(client: Client, event: KillEvent) {
		await toDiscord(event);
	},
};

export default playerKilledByPlayer;
