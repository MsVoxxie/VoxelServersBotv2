import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { chatlinkCache, userdataCache } from '../../vsb';
import { chatlinkModel } from '../../models/chatlink';
import { UserData } from '../../models/userData';
import logger from '../../utils/logger';

const INTERVAL_MS = 60_000; // 1 minute

const cacheChatlinks: ScheduleTaskData = {
	name: 'Cache Chatlinks',
	run({ client }) {
		const runCache = async () => {
			try {
				// Chatlinks
				const chatlinks = await chatlinkModel.find().lean();
				const linkedInstanceIDs = new Set(chatlinks.map((link) => link.instanceId));
				chatlinkCache.set('linkedInstanceIDs', linkedInstanceIDs);

				// User Data
				const userData = await UserData.find().select('-_id -__v').lean();
				const userDataSet = new Set(userData);
				userdataCache.set('userDataSet', userDataSet);
			} catch (error) {
				logger.error('cacheChatlinks', error instanceof Error ? error.message : String(error));
			}
		};
		runCache();
		setInterval(runCache, INTERVAL_MS);
	},
};

export default cacheChatlinks;
