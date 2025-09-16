import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { getAllInstances } from '../../utils/ampAPI/mainFuncs';
import { getJson, setJson, TTL } from '../../utils/redisHelpers';
import { ExtendedInstance } from '../../types/ampTypes/ampTypes';
import logger from '../../utils/logger';
const watchInstances: ScheduleTaskData = {
	name: 'Watch Instance Updates',
	async run({ client, redisClient }) {
		const checkUpdates = async () => {
			try {
				const rawPrev = (await getJson<ExtendedInstance | ExtendedInstance[] | null>(redisClient, 'instances:cached')) ?? null;
				const prev: ExtendedInstance[] = rawPrev ? (Array.isArray(rawPrev) ? rawPrev : [rawPrev]) : [];
				// fetch current set
				const current = (await getAllInstances({ fetch: 'all' })) as ExtendedInstance[];

				// build maps by InstanceID
				const prevMap = new Map(prev.map((i: ExtendedInstance) => [i.InstanceID, i]));
				const currMap = new Map(current.map((i: ExtendedInstance) => [i.InstanceID, i]));

				// created
				for (const [id, inst] of currMap) {
					if (!prevMap.has(id)) {
						client.emit('instanceCreated', inst);
					}
				}

				// deleted
				for (const [id, inst] of prevMap) {
					if (!currMap.has(id)) {
						client.emit('instanceDeleted', inst);
					}
				}
				// update the instance cache so next run compares against this snapshot
				await setJson(redisClient, 'instances:cached', current, '$', TTL(7, 'Days'));
			} catch (error) {
				logger.error('watchInstances', error instanceof Error ? error.message : String(error));
			}
		};
		await checkUpdates();
		setInterval(checkUpdates, 300_000); // 5min
	},
};

export default watchInstances;
