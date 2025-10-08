import { StateChangeEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import logger from '../../utils/logger';
import { Client } from 'discord.js';
import { getKeys, setJson, TTL } from '../../utils/redisHelpers';
import redis from '../../loaders/database/redisLoader';
import { playerSchema } from '../../types/apiTypes/serverEventTypes';

const unexpectedStop: EventData = {
	name: 'unexpectedStop',
	runType: 'always',
	async execute(client: Client, event: StateChangeEvent) {
		try {
			await toDiscord(event);

			// Update all players to not playing and set lastSeen if not already set
			const players: playerSchema[] | null = await getKeys(redis, `playerdata:${event.InstanceId}:*`);
			if (players) {
				for (const player of players) {
					if (!player.isPlaying) {
						// Add to total playtime if they had a lastJoin
						const totalPlaytime = (player.totalPlaytimeMs || 0) + (Date.now() - player.lastJoin || 0);
						player.totalPlaytimeMs = totalPlaytime;
						player.lastSeen = Date.now();
					}

					player.isPlaying = false;
					setJson(redis, `playerdata:${event.InstanceId}:${player.Username}`, player, '$', TTL(30, 'Days'));
				}
			}
		} catch (error) {
			logger.error('UnexpectedStop', `Error processing unexpected stop event: ${error}`);
		}
	},
};

export default unexpectedStop;
