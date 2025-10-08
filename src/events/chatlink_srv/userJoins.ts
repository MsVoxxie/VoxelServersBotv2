import { playerSchema } from '../../types/apiTypes/serverEventTypes';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { getJson, setJson, TTL } from '../../utils/redisHelpers';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { msToHuman } from '../../utils/utils';
import logger from '../../utils/logger';
import { Client } from 'discord.js';
import { toDiscordTimestamp } from '../../utils/discord/timestampGenerator';

const userJoins: EventData = {
	name: 'userJoins',
	runType: 'always',
	async execute(client: Client, event: PlayerEvent) {
		try {
			const oldData = (await getJson(redis, `playerdata:${event.InstanceId}:${event.Username}`)) as playerSchema;

			if (!oldData) event.Message += `\n-# This is their first time joining.`;
			else {
				const convertedLast = new Date(oldData.lastSeen);
				const lastSeen = toDiscordTimestamp(convertedLast, 'R');
				if (lastSeen.length) event.Message += `\n-# Last seen: ${lastSeen}`;
			}

			// Send to Discord
			await toDiscord(event);

			// Record join time
			if (event.Username !== 'SERVER') {
				const now = Date.now();
				let totalPlaytimeMs = oldData?.totalPlaytimeMs || 0;
				const firstSeen = oldData?.firstSeen || now;

				// If lastJoin exists and lastSeen < lastJoin, add missed session
				if (oldData?.lastJoin && oldData?.lastSeen && oldData.lastSeen < oldData.lastJoin) {
					const missedSession = now - oldData.lastJoin;
					totalPlaytimeMs += missedSession;
				}

				const userData: playerSchema = {
					isPlaying: true,
					Username: event.Username,
					userId: event.UserId || '',
					lastJoin: now,
					lastSeen: now,
					firstSeen,
					totalPlaytimeMs,
				};
				setJson(redis, `playerdata:${event.InstanceId}:${event.Username}`, userData, '$', TTL(30, 'Days'));
			}
		} catch (error) {
			logger.error('UserJoins', `Error processing user joins event: ${error}`);
		}
	},
};

export default userJoins;
