import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { getAllInstances } from '../../utils/ampAPI/mainFuncs';
import { setJson } from '../../utils/redisHelpers';
const cacheInstances: ScheduleTaskData = {
	name: 'Cache AMP Instances',
	async run({ client, redisClient }) {
		const cache = async () => {
			try {
				const instances = await getAllInstances({ fetch: 'all' });
				await Promise.all(instances.map(async (instance) => await setJson(redisClient, `instance:${instance.InstanceID}`, instance, '$', 15))); // 15 seconds TTL
				await setJson(redisClient, 'instances:all', instances, '$', 15);
			} catch (error) {
				console.error('Error caching instances:', error);
			}
		};
		await cache();
		setInterval(cache, 10_000); // 10s
	},
};

export default cacheInstances;
