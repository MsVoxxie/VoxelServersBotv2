import { playerSchema } from '../../types/apiTypes/serverEventTypes';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { getJson, setJson, TTL } from '../../utils/redisHelpers';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { msToHuman } from '../../utils/utils';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const userLeaves: EventData = {
	name: 'userLeaves',
	runType: 'always',
	async execute(client: Client, event: PlayerEvent) {
		try {
			const oldData = (await getJson(redis, `playerdata:${event.InstanceId}:${event.Username}`)) as playerSchema;

			if (oldData) {
				const duration = Date.now() - oldData.lastJoin;
				const timePlayed = msToHuman(duration);
				if (timePlayed.length) event.Message += `\n-# Played for: ${timePlayed.join(' ')}`;
			}

			// Send to Discord
			await toDiscord(event);

			// Record last seen and playtime
			if (event.Username === 'SERVER') return;
			const totalPlaytime = (oldData?.totalPlaytimeMs || 0) + (Date.now() - oldData.lastJoin || 0);
			const userData: playerSchema = { Username: event.Username, userId: oldData?.userId || '', lastJoin: oldData.lastJoin, lastSeen: Date.now(), firstSeen: oldData?.firstSeen || Date.now(), totalPlaytimeMs: totalPlaytime };
			setJson(redis, `playerdata:${event.InstanceId}:${event.Username}`, userData, '$', TTL(30, 'Days'));
		} catch (error) {
			logger.error('UserLeaves', `Error processing user leaves event: ${error}`);
		}
	},
};

export default userLeaves;
