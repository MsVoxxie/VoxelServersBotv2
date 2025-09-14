import { getServerPlayerInfo, sendServerConsoleCommand } from '../../utils/ampAPI/mainFuncs';
import { calculateSleepingPercentage } from '../../utils/gameSpecific/minecraft';
import { part, tellRawBuilder } from '../../utils/gameSpecific/minecraftTellraw';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { ExtendedInstance } from '../../types/ampTypes/ampTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';
import { wait } from '../../utils/utils';
import { Client } from 'discord.js';

const userLeaves_MCSleep: EventData = {
	name: 'userLeaves',
	runType: 'always',
	async execute(client: Client, event: PlayerEvent) {
		// Sleep Percentage Calculation
		const instanceData: ExtendedInstance | null = await getJson(redis, `instance:${event.InstanceId}`);
		if (!instanceData) return;
		if (instanceData.Module !== 'Minecraft') return;

		const { currentPlayers, maxPlayers } = await getServerPlayerInfo(instanceData);
		const { sleepPercentage, requiredToSleep } = calculateSleepingPercentage(currentPlayers.length, maxPlayers);
		event.Message = `-# There ${currentPlayers.length === 1 ? 'is' : 'are'} now ${currentPlayers.length} player${currentPlayers.length === 1 ? '' : 's'} online.`;
		if (currentPlayers.length === 0) event.Message += '\n-# The server is now empty.';

		if (!client.mcSleepCache.has(event.InstanceId)) client.mcSleepCache.set(event.InstanceId, sleepPercentage);
		const mcSleepCache = client.mcSleepCache.get(event.InstanceId) ?? 0;
		client.mcSleepCache.set(event.InstanceId, sleepPercentage);

		// only announce if the sleep percentage has changed since last time
		if (mcSleepCache !== sleepPercentage) {
			const serverMsg = tellRawBuilder([
				part('[S]', 'yellow', { hoverEvent: { action: 'show_text', contents: 'Server' } }),
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

export default userLeaves_MCSleep;
