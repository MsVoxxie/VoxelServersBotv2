import { Events, Client } from 'discord.js';
import Logger from '../../utils/logger';
import { EventData } from '../../types/commandTypes';
import { connectRedis } from '../../loaders/database/redisLoader';
import runScheduledTasks from '../../loaders/scheduler/loadSchedules';

const ready: EventData = {
	name: Events.ClientReady,
	runType: 'once',
	async execute(client: Client) {
		Logger.success('Ready Event', `Logged in as ${client.user!.tag}!`);

		// Log into Redis
		const redisClient = await connectRedis();
		client.redis = redisClient;

		// Start Scheduler
		await runScheduledTasks({ client, redisClient });
	},
};

export default ready;
