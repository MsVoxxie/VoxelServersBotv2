import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { getJson, setJson, TTL } from '../../utils/redisHelpers';
import { ExtendedInstance } from '../../types/ampTypes/ampTypes';
import { getAllInstances } from '../../utils/ampAPI/mainFuncs';
import logger from '../../utils/logger';

const INTERVAL_MS = 300_000; // 5 minutes
const watchInstances: ScheduleTaskData = {
	name: 'Watch Instance Updates',
	run({ client, redisClient }) {
		const checkUpdates = async () => {
			try {
				const rawPrev = (await getJson<ExtendedInstance | ExtendedInstance[] | null>(redisClient, 'instances:cached')) ?? null;
				const prev: ExtendedInstance[] = rawPrev ? (Array.isArray(rawPrev) ? rawPrev : [rawPrev]) : [];
				// fetch current set
				const current = (await getAllInstances({ fetch: 'all' })) as ExtendedInstance[];
				if (!current || current.length === 0) return logger.warn('watchInstances', 'Failed to fetch instances, skipping update check.');

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
		checkUpdates();
		setInterval(checkUpdates, INTERVAL_MS);
	},
};

export default watchInstances;
