import { part, tellRawBuilder } from '../../utils/gameSpecific/minecraftTellraw';
import { AdvancementEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { sendServerConsoleCommand } from '../../utils/ampAPI/mainFuncs';
import { EventData } from '../../types/discordTypes/commandTypes';
import { ExtendedInstance } from '../../types/ampTypes/ampTypes';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';
import { Client } from 'discord.js';

const playerAdvancement: EventData = {
	name: 'playerAdvancement',
	runType: 'always',
	async execute(client: Client, event: AdvancementEvent) {
		const instanceData = (await getJson(redis, `instance:${event.InstanceId}`)) as ExtendedInstance | null;
		if (!instanceData) return;
		if (instanceData.Module !== 'Minecraft') return;

		// Handle the "Free the End" advancement
		if (event.Message.toLowerCase().includes('free the end')) {
			const serverMsg = tellRawBuilder([
				part('[S]', 'gold', { hoverEvent: { action: 'show_text', contents: 'Server' } }),
				part('Hey', 'white'),
				part(`${event.Username}`, 'aqua'),
				part("Don't forget to", 'white'),
				part('respawn', 'green'),
				part('the', 'white'),
				part('Ender Dragon', 'dark_purple', { bold: true }),
				part('for other players!', 'white'),
				part("[Here's How!]", 'blue', {
					bold: true,
					hoverEvent: { action: 'show_text', contents: 'Click Me!' },
					clickEvent: { action: 'open_url', value: 'https://minecraft.wiki/w/Ender_Dragon#Re-summoning' },
				}),
			]);
			await sendServerConsoleCommand(event.InstanceId, instanceData.Module, serverMsg);
		}
	},
};

export default playerAdvancement;
