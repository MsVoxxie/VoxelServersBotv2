import { part, tellRawBuilder } from '../gameSpecific/minecraftTellraw';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { ChatlinkBase } from '../../types/apiTypes/chatlinkAPITypes';
import { sendServerConsoleCommand } from '../ampAPI/instanceFuncs';
import redis from '../../loaders/database/redisLoader';
import { chatlinkModel } from '../../models/chatlink';
import { Message, WebhookClient } from 'discord.js';
import { getJson } from '../redisHelpers';
import logger from '../logger';

export async function toDiscord(data: ChatlinkBase) {
	try {
		const [instanceData, chatlinkData] = await Promise.all([
			getJson<SanitizedInstance>(redis, `instance:${data.InstanceId}`),
			chatlinkModel.findOne({ instanceId: data.InstanceId }),
		]);

		if (!instanceData) throw new Error(`Failed to fetch instance data for ID ${data.InstanceId}`);
		if (!chatlinkData) throw new Error(`Failed to fetch chatlink data for ID ${data.InstanceId}`);

		// const instanceModule = instanceData.Module;
		const [webhookId, webhookToken] = [chatlinkData.webhookId, chatlinkData.webhookToken];
		const wsClient = new WebhookClient({ id: webhookId, token: webhookToken });
		const playerImage = (await fetch(`${process.env.API_URI}/data/avatar/${data.UserId}`)).url;

		// switch (instanceModule) {
		// 	case 'Minecraft':
		// 		playerImage = `${process.env.API_URI}/data/avatar/${data.UserId}`;
		// 		break;

		// 	case 'GenericModule':
		// 		playerImage = `${process.env.API_URI}/data/avatar/${data.UserId}`;
		// 		break;
		// }

		// guard against failed sends
		await wsClient
			.send({
				username: `${data.Username} | ${instanceData.FriendlyName}`,
				avatarURL: data.Username === 'SERVER' ? `${process.env.API_URI}/static/imgs/servericon.png` : playerImage,
				content: data.Message,
			})
			.catch((err) => {
				logger.error('Discord Webhook', `Failed to send message via webhook for instance ${instanceData.FriendlyName}: ${err.message}`);
			});
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : String(error);
		logger.error('Discord Webhook', `Error preparing discord webhook send: ${errMsg}`);
		throw error;
	}
}

export async function toServer(InstanceId: string, message: Message) {
	try {
		const [instanceData, chatlinkData] = await Promise.all([getJson<SanitizedInstance>(redis, `instance:${InstanceId}`), chatlinkModel.findOne({ instanceId: InstanceId })]);
		if (!instanceData || !chatlinkData) return logger.warn('Discord Webhook', `Failed to retrieve necessary data for instance ID ${InstanceId}`);
		const instanceModule = instanceData.Module;

		switch (instanceModule) {
			case 'Minecraft':
				const serverMsg = tellRawBuilder('@a', [
					part('[D]', 'blue', { hoverEvent: { action: 'show_text', contents: message.guild ? message.guild.name : 'Unknown Server' } }),
					part('<', 'white'),
					part(message.member?.displayName || 'Unknown', message.member?.displayHexColor || 'white'),
					part('>', 'white'),
					part(` ${message.content}`, 'white'),
				]);

				await sendServerConsoleCommand(InstanceId, instanceModule, serverMsg);
				break;

			default:
				await sendServerConsoleCommand(InstanceId, instanceModule, `say "[D] ${message.member?.displayName}: ${message.content}"`);
				break;
		}
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : String(error);
		logger.error('Discord Webhook', `Error preparing server send: ${errMsg}`);
		throw error;
	}
}
