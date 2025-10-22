import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { getJson, setJson, TTL } from '../../utils/redisHelpers';
import { getAllInstances } from '../../utils/ampAPI/coreFuncs';
import logger from '../../utils/logger';

const INTERVAL_MS = 60_000; // 1 minute
const watchInstances: ScheduleTaskData = {
	name: 'Watch Instance Updates',
	run({ client, redisClient }) {
		const checkUpdates = async () => {
			try {
				const rawPrev = (await getJson<SanitizedInstance | SanitizedInstance[] | null>(redisClient, 'instanceSnapshot')) ?? null;
				const prev: SanitizedInstance[] = rawPrev ? (Array.isArray(rawPrev) ? rawPrev : [rawPrev]) : [];
				// fetch current set
				const current = (await getAllInstances({ fetch: 'all' })) as SanitizedInstance[];
				if (!current || current.length === 0) return logger.warn('watchInstances', 'Failed to fetch instances, skipping update check.');

				// build maps by InstanceID
				const prevMap = new Map(prev.map((i: SanitizedInstance) => [i.InstanceID, i]));
				const currMap = new Map(current.map((i: SanitizedInstance) => [i.InstanceID, i]));

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
				await setJson(redisClient, 'instanceSnapshot', current, '$', TTL(7, 'Days'));
			} catch (error) {
				logger.error('watchInstances', error instanceof Error ? error.message : String(error));
			}
		};
		checkUpdates();
		setInterval(checkUpdates, INTERVAL_MS);
	},
};

export default watchInstances;
