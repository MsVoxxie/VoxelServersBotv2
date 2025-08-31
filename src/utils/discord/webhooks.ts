import { ChatlinkBase } from '../../types/apiTypes/chatlinkAPITypes';
import { ExtendedInstance } from '../../types/ampTypes/ampTypes';
import redis from '../../loaders/database/redisLoader';
import { chatlinkModel } from '../../models/chatlink';
import { Message, WebhookClient } from 'discord.js';
import { getJson } from '../redisHelpers';
import { sendServerConsoleCommand } from '../ampAPI/main';

export async function toDiscord(data: ChatlinkBase) {
	try {
		const [instanceData, chatlinkData] = await Promise.all([
			getJson<ExtendedInstance[]>(redis, `instance:${data.InstanceId}`),
			chatlinkModel.findOne({ instanceId: data.InstanceId }),
		]);
		if (!instanceData || !chatlinkData) throw new Error('Failed to retrieve necessary data');

		const instanceModule = instanceData[0].Module;
		const [webhookId, webhookToken] = [chatlinkData.webhookId, chatlinkData.webhookToken];
		const wsClient = new WebhookClient({ id: webhookId, token: webhookToken });
		let playerImage;

		switch (instanceModule) {
			case 'Minecraft':
				playerImage = `${process.env.API_URI}/data/mchead/${data.Username}`;
				break;

			case 'GenericModule':
				playerImage = `${process.env.API_URI}/data/steamavatar/${data.SteamId}`;
				break;
		}

		await wsClient.send({
			username: `${data.Username} | ${instanceData[0].FriendlyName}`,
			avatarURL: data.Username === 'SERVER' ? `${process.env.API_URI}/static/imgs/servericon.png` : playerImage,
			content: data.Message,
		});
	} catch (error) {
		console.error('Error preparing discord webhook send:', error);
		throw error;
	}
}

export async function toServer(InstanceId: string, message: Message) {
	try {
		const [instanceData, chatlinkData] = await Promise.all([getJson<ExtendedInstance[]>(redis, `instance:${InstanceId}`), chatlinkModel.findOne({ instanceId: InstanceId })]);
		if (!instanceData || !chatlinkData) throw new Error('Failed to retrieve necessary data');
		const instanceModule = instanceData[0].Module;

		switch (instanceModule) {
			case 'Minecraft':
				await sendServerConsoleCommand(
					InstanceId,
					instanceModule,
					`tellraw @a ["",{"text":"[D] ","color":"blue","hoverEvent":{"action":"show_text","contents":[{"text":"${
						message.guild ? message.guild.name : 'Unknown Server'
					}","color":"blue"}]}},{"text":"<"},{"text":"${message.member?.displayName}","color":"${
						message.member?.displayHexColor
					}"},{"text":">"},{"text":"${` ${message.content}`}"}]`
				);
				break;

			default:
				await sendServerConsoleCommand(InstanceId, instanceModule, `say [D] ${message.content}`);
				break;
		}
	} catch (error) {
		console.error('Error preparing server send:', error);
		throw error;
	}
}
