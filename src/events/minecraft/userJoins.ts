import { getServerPlayerInfo, sendServerConsoleCommand } from '../../utils/ampAPI/mainFuncs';
import { calculateSleepingPercentage } from '../../utils/gameSpecific/minecraft';
import { part, tellRawBuilder } from '../../utils/gameSpecific/minecraftTellraw';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { getJson, setJson, TTL } from '../../utils/redisHelpers';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { wait } from '../../utils/utils';
import { Client } from 'discord.js';

const userJoins_MCSleep: EventData = {
	name: 'userJoins',
	runType: 'always',
	async execute(client: Client, event: PlayerEvent) {
		// Sleep Percentage Calculation
		const [instanceData, prevPercentage] = (await Promise.all([getJson(redis, `instance:${event.InstanceId}`), getJson(redis, `instance:minecraft:${event.InstanceId}`)])) as [
			SanitizedInstance | null,
			{ sleepPercentage: number; requiredToSleep: number } | null
		];

		if (!instanceData) return;
		if (instanceData.Module !== 'Minecraft') return;

		const { currentPlayers, maxPlayers } = await getServerPlayerInfo(instanceData);
		const { sleepPercentage, requiredToSleep } = calculateSleepingPercentage(currentPlayers.length, maxPlayers);
		setJson(redis, `instance:minecraft:${event.InstanceId}`, { sleepPercentage, requiredToSleep }, '$', TTL(1, 'Days'));
		event.Message = `-# There ${currentPlayers.length === 1 ? 'is' : 'are'} now ${currentPlayers.length} player${currentPlayers.length === 1 ? '' : 's'} online.`;

		// only announce if the sleep percentage has changed since last time
		if (prevPercentage?.sleepPercentage !== sleepPercentage) {
			const serverMsg = tellRawBuilder([
				part('[S]', 'gold', { hoverEvent: { action: 'show_text', contents: 'Server' } }),
				part('Updating sleep percentage,', 'white'),
				part(`${requiredToSleep}`, 'aqua', { bold: true }),
				part(`player${requiredToSleep === 1 ? '' : 's'} ${requiredToSleep === 1 ? 'is' : 'are'} are required to sleep`, 'white'),
			]);
			event.Message += `\n-# Updating sleep percentage, ${requiredToSleep} player${requiredToSleep === 1 ? '' : 's'} now required to sleep.`;
			await sendServerConsoleCommand(event.InstanceId, instanceData.Module, serverMsg);
		}
		event.Username = 'SERVER';
		await Promise.all([wait(500), toDiscord(event), sendServerConsoleCommand(event.InstanceId, instanceData.Module, `gamerule playersSleepingPercentage ${sleepPercentage}`)]);
	},
};

export default userJoins_MCSleep;
