import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { getAllInstances } from '../../utils/ampAPI/main';
import { getJson } from '../../utils/redisHelpers';
import { ExtendedInstance } from '../../types/ampTypes/ampTypes';
const watchInstances: ScheduleTaskData = {
	name: 'Watch Instance Updates',
	async run({ client, redisClient }) {
		const checkUpdates = async () => {
			const rawPrev = (await getJson<ExtendedInstance | ExtendedInstance[] | null>(redisClient, 'instances:all')) ?? null;
			const prev: ExtendedInstance[] = rawPrev ? (Array.isArray(rawPrev) ? rawPrev : [rawPrev]) : [];
			// fetch current set
			const current = (await getAllInstances({ fetch: 'all' })) as ExtendedInstance[];

			// build maps by InstanceID
			const prevMap = new Map(prev.map((i: ExtendedInstance) => [i.InstanceID, i]));
			const currMap = new Map(current.map((i: ExtendedInstance) => [i.InstanceID, i]));

			// detect created
			for (const [id, inst] of currMap) {
				if (!prevMap.has(id)) {
					client.emit('instanceCreated', inst);
				}
			}

			// detect deleted
			for (const [id, inst] of prevMap) {
				if (!currMap.has(id)) {
					client.emit('instanceDeleted', inst);
				}
			}
		};
		await checkUpdates();
		setInterval(checkUpdates, 30_000); // 5min
	},
};

export default watchInstances;
