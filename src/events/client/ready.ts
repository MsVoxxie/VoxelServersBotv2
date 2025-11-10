import runScheduledTasks from '../../loaders/scheduler/loadSchedules';
import { EventData } from '../../types/discordTypes/commandTypes';
import { connectRedis } from '../../loaders/database/redisLoader';
import mongoLoader from '../../loaders/database/mongoLoader';
import { Events, Client } from 'discord.js';
import logger from '../../utils/logger';

const ready: EventData = {
	name: Events.ClientReady,
	runType: 'once',
	async execute(client: Client) {
		try {
			logger.success('Ready Event', `Logged in as ${client.user!.tag}!`);
			// Log into Redis
			await connectRedis().then(async (redisClient) => {
				logger.success('Redis', 'Connected to Redis successfully.');
				client.redis = redisClient;
				// Load Mongoose
				await mongoLoader.init().then(async () => {
					// Start Scheduler
					await runScheduledTasks({ client, redisClient });
				});
			});
		} catch (error) {
			logger.error('Ready Event', `Error processing ready event: ${error}`);
		}
	},
};

export default ready;
