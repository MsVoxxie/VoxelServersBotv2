import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { getAllInstances } from '../../utils/ampAPI/coreFuncs';
import { mergeJson, setJson, TTL } from '../../utils/redisHelpers';
import logger from '../../utils/logger';

const INTERVAL_MS = 10_000; // 10 seconds
const cacheInstances: ScheduleTaskData = {
	name: 'Cache AMP Instances',
	run({ client, redisClient }) {
		const runCache = async () => {
			try {
				const instances = await getAllInstances({ fetch: 'all' });
				if (!instances || instances.length === 0) return logger.warn('cacheInstances', 'Failed to fetch instances, skipping cache update.');
				await Promise.all(instances.map(async (instance) => await mergeJson(redisClient, `instance:${instance.InstanceID}`, instance, '.', TTL(15, 'Seconds'))));
				// await setJson(redisClient, 'instances:all', instances, '$', TTL(15, 'Seconds'));
			} catch (error) {
				logger.error('cacheInstances', error instanceof Error ? error.message : String(error));
			}
		};
		runCache();
		setInterval(runCache, INTERVAL_MS);
	},
};

export default cacheInstances;
