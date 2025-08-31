import { Events, Client, Message } from 'discord.js';
import { EventData } from '../../types/discordTypes/commandTypes';
import { chatlinkModel } from '../../models/chatlink';
import { toServer } from '../../utils/discord/webhooks';
import { getJson } from '../../utils/redisHelpers';
import { ExtendedInstance } from '../../types/ampTypes/ampTypes';
import redis from '../../loaders/database/redisLoader';

const messageCreate: EventData = {
	name: Events.MessageCreate,
	runType: 'always',
	async execute(client: Client, message: Message) {
		if (message.author.bot) return;
		const chatLinks = await chatlinkModel.find({ channelId: message.channel.id });
		if (!chatLinks.some((cl: any) => cl.channelId === message.channel.id)) return;
		if (!chatLinks[0].instanceId) return;
	const instanceData = await getJson<ExtendedInstance>(redis, `instance:${chatLinks[0].instanceId}`);
		if (!instanceData) return;

		await toServer(chatLinks[0].instanceId, message);
	},
};

export default messageCreate;
