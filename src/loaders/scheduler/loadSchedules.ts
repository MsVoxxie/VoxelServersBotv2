import { join } from 'path';
import getAllFiles from '../../utils/fileFuncs';
import logger from '../../utils/logger';

export default async function runScheduledTasks(deps?: any) {
	const scheduleFolders = getAllFiles(join(__dirname, '../../scheduledTasks'), true);

	for (const scheduleFolder of scheduleFolders) {
		const scheduleFiles = getAllFiles(scheduleFolder);
		scheduleFiles.sort((a: string, b: string) => (a > b ? 1 : a < b ? -1 : 0));
		logger.info(`Scheduler - ${scheduleFolder.split('/').pop()}`, `Starting load of ${scheduleFiles.length} tasks...`);
		for (const scheduleFile of scheduleFiles) {
			try {
				const mod = require(scheduleFile);
				const loadedTask = mod.default || mod;
				if (loadedTask && typeof loadedTask.run === 'function') {
					logger.success('Scheduler', `Started scheduled task: ${loadedTask.name}`);
					await loadedTask.run(deps);
				} else {
					logger.warn('Scheduler', `No valid scheduled task export in: ${scheduleFile}`);
				}
			} catch (err) {
				logger.error('Scheduler', `Error running scheduled task ${scheduleFile}: ${err}`);
			}
		}
	}
}
