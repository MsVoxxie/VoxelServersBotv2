import { StateChangeEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import redis from '../../loaders/database/redisLoader';
import { setJson } from '../../utils/redisHelpers';
import { Client } from 'discord.js';

const userJoins: EventData = {
	name: 'userJoins',
	runType: 'always',
	async execute(client: Client, event: StateChangeEvent) {
		await toDiscord(event);
		const joinTime = Date.now();
		setJson(redis, `joinDuration:${event.InstanceId}:${event.Username}`, { joined: joinTime }, '$', 60 * 60 * 48); // 2 day expiry
	},
};

export default userJoins;
