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
		const instanceData: ExtendedInstance | null = await getJson(redis, `instance:${event.InstanceId}`);
		if (!instanceData) return;

		// Sleep Percentage Calculation
		if (instanceData.Module === 'Minecraft') {
			const { currentPlayers, maxPlayers } = await getServerPlayerInfo(instanceData);
			const { sleepPercentage, requiredToSleep } = calculateSleepingPercentage(currentPlayers.length, maxPlayers);
			await sendServerConsoleCommand(event.InstanceId, instanceData.Module, `gamerule playersSleepingPercentage ${sleepPercentage}`);
			if (currentPlayers.length === 0) {
				event.Message = `-# There are ${currentPlayers.length} players online.\n-# The server is now empty.`;
			} else {
				event.Message = `-# ${currentPlayers.length} players online.\n-# Updating sleep percentage to ${sleepPercentage}% (${requiredToSleep} player${
					requiredToSleep === 1 ? '' : 's'
				} required to sleep)`;
			}

			// Build tellraw
			const serverMsg = tellRawBuilder([
				part('[S]', 'yellow', { hoverEvent: { action: 'show_text', contents: 'Server' } }),
				part('Updating sleep percentage,', 'white'),
				part(`${requiredToSleep}`, 'aqua', { bold: true }),
				part(`player${requiredToSleep === 1 ? '' : 's'} ${requiredToSleep === 1 ? 'is' : 'are'} now required to sleep`, 'white'),
			]);

			event.Username = 'SERVER';
			await Promise.all([wait(500), toDiscord(event), sendServerConsoleCommand(event.InstanceId, instanceData.Module, serverMsg)]);
		}
	},
};

export default userLeaves_MCSleep;
