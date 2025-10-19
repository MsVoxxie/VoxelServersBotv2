import { getServerPlayerInfo, sendServerConsoleCommand } from '../../utils/ampAPI/coreFuncs';
import { SanitizedInstance, SleepGamerule } from '../../types/ampTypes/instanceTypes';
import { calculateSleepingPercentage } from '../../utils/gameSpecific/minecraft';
import { part, tellRawBuilder } from '../../utils/gameSpecific/minecraftTellraw';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { getJson, setJson } from '../../utils/redisHelpers';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { wait } from '../../utils/utils';
import { Client } from 'discord.js';

const batchQueues = new Map<string, PlayerEvent[]>();
const batchTimers = new Map<string, NodeJS.Timeout>();
const BATCH_WINDOW_MS = 5_000; // 5 seconds

async function processBatch(client: Client, instanceId: string) {
	const queue = batchQueues.get(instanceId) || [];
	if (queue.length === 0) return;
	const event = queue[queue.length - 1];

	const instanceData = (await getJson(redis, `instance:${event.InstanceId}`)) as SanitizedInstance | null;

	if (!instanceData || instanceData.Module !== 'Minecraft') return;

	const { currentPlayers, maxPlayers } = await getServerPlayerInfo(instanceData);
	const { sleepPercentage, requiredToSleep } = calculateSleepingPercentage(currentPlayers.length, maxPlayers);
	setJson(redis, `instance:${instanceId}`, { playersSleepingPercentage: { sleepPercentage, requiredToSleep } }, '.Gamerules');

	let message = `-# There ${currentPlayers.length === 1 ? 'is' : 'are'} now ${currentPlayers.length} player${currentPlayers.length === 1 ? '' : 's'} online.`;
	if (currentPlayers.length === 0) message += '\n-# The server is now empty.';

	const sleepRule = instanceData.Gamerules?.playersSleepingPercentage as SleepGamerule;
	if (sleepRule?.requiredToSleep !== requiredToSleep && sleepRule?.requiredToSleep > 0) {
		const serverMsg = tellRawBuilder('@a', [
			part('[S]', 'gold', { hoverEvent: { action: 'show_text', contents: 'Server' } }),
			part('Updating sleep percentage,', 'white'),
			part(`${requiredToSleep}`, 'aqua', { bold: true }),
			part(`player${requiredToSleep === 1 ? '' : 's'} ${requiredToSleep === 1 ? 'is' : 'are'} are required to sleep`, 'white'),
		]);
		message += `\n-# Updating sleep percentage, ${requiredToSleep} player${requiredToSleep === 1 ? '' : 's'} now required to sleep.`;
		await sendServerConsoleCommand(instanceId, instanceData.Module, serverMsg);
	}

	// Batch info: how many players left
	if (queue.length > 1) {
		message += `\n-# ${queue.length} players left.`;
	}

	const batchEvent = { ...event, Message: message, Username: 'SERVER' };
	await Promise.all([wait(500), toDiscord(batchEvent), sendServerConsoleCommand(instanceId, instanceData.Module, `gamerule playersSleepingPercentage ${sleepPercentage}`)]);
	batchQueues.set(instanceId, []);
	batchTimers.delete(instanceId);
}

const userLeaves_MCSleep: EventData = {
	name: 'userLeaves',
	runType: 'always',
	async execute(client: Client, event: PlayerEvent) {
		const instanceId = event.InstanceId;
		const queue = batchQueues.get(instanceId) || [];
		queue.push(event);
		batchQueues.set(instanceId, queue);

		// Clear and reset timer for this instance
		if (batchTimers.has(instanceId)) clearTimeout(batchTimers.get(instanceId)!);
		const timer = setTimeout(() => processBatch(client, instanceId), BATCH_WINDOW_MS);
		batchTimers.set(instanceId, timer);
	},
};

export default userLeaves_MCSleep;
