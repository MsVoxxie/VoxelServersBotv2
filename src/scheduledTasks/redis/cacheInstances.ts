import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { getAllInstances } from '../../utils/ampAPI/main';
import { setJson } from '../../utils/redisHelpers';
const cacheInstances: ScheduleTaskData = {
	name: 'Cache AMP Instances',
	async run({ client, redisClient }) {
		const cache = async () => {
			const instances = await getAllInstances({ fetch: 'all' });
			await Promise.all(instances.map(async (instance) => await setJson(redisClient, `instance:${instance.InstanceID}`, instance, '$', 60)));
			await setJson(redisClient, 'instances:all', instances, '$', 60);
		};
		await cache();
		setInterval(cache, 10_000); // 10s
	},
};

export default cacheInstances;
