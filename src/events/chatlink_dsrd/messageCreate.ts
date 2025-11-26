import { Events, Client, Message } from 'discord.js';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toServer } from '../../utils/discord/webhooks';
import { RedisKeys } from '../../types/redisKeys/keys';
import redis from '../../loaders/database/redisLoader';
import { chatlinkModel } from '../../models/chatlink';
import { getJson } from '../../utils/redisHelpers';
import logger from '../../utils/logger';
const messageCreate: EventData = {
	name: Events.MessageCreate,
	runType: 'always',
	async execute(client: Client, message: Message) {
		try {
			if (message.author.bot) return;
			const chatLinks = await chatlinkModel.find({ channelId: message.channel.id });
			if (!chatLinks.some((cl: any) => cl.channelId === message.channel.id)) return;
			if (!chatLinks[0].instanceId) return;
			const instanceData = await getJson<SanitizedInstance>(redis, RedisKeys.instance(chatLinks[0].instanceId));
			if (!instanceData) return;

			await toServer(chatLinks[0].instanceId, message);
		} catch (error) {
			logger.error('DiscordToServer', `Error processing message: ${error}`);
		}
	},
};

export default messageCreate;
