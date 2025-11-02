import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { chatlinkModel } from '../../models/chatlink';
import logger from '../../utils/logger';
import { mongoCache } from '../../vsb';

const INTERVAL_MS = 60_000; // 1 minute

const cacheChatlinks: ScheduleTaskData = {
	name: 'Cache Chatlinks',
	run({ client }) {
		const runCache = async () => {
			try {
				const chatlinks = await chatlinkModel.find().lean();
				const linkedInstanceIDs = new Set(chatlinks.map((link) => link.instanceId));
				mongoCache.set('linkedInstanceIDs', linkedInstanceIDs);
			} catch (error) {
				logger.error('cacheChatlinks', error instanceof Error ? error.message : String(error));
			}
		};
		runCache();
		setInterval(runCache, INTERVAL_MS);
	},
};

export default cacheChatlinks;
