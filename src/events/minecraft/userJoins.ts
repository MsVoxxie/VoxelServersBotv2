import { calculateSleepingPercentage } from '../../utils/gameSpecific/minecraft';
import { getServerPlayerInfo, sendServerConsoleCommand } from '../../utils/ampAPI/mainFuncs';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { ExtendedInstance } from '../../types/ampTypes/ampTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';
import { wait } from '../../utils/utils';
import { Client } from 'discord.js';

const userJoins_MCSleep: EventData = {
	name: 'userJoins',
	runType: 'always',
	async execute(client: Client, event: PlayerEvent) {
		const instanceData: ExtendedInstance | null = await getJson(redis, `instance:${event.InstanceId}`);
		if (!instanceData) return;

		// Sleep Percentage Calculation
		if (instanceData.Module === 'Minecraft') {
			const { currentPlayers, maxPlayers } = await getServerPlayerInfo(instanceData);
			const { sleepPercentage, requiredToSleep } = calculateSleepingPercentage(currentPlayers.length, maxPlayers);
			await sendServerConsoleCommand(event.InstanceId, instanceData.Module, `gamerule playersSleepingPercentage ${sleepPercentage}`);
			event.Message = `-# Updating sleep percentage to ${sleepPercentage}% (${requiredToSleep} player${requiredToSleep === 1 ? '' : 's'} required to sleep)`;
			event.Username = 'SERVER';
			await Promise.all([wait(500), toDiscord(event)]);
		}
	},
};

export default userJoins_MCSleep;
