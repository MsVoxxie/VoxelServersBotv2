import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { ButtonHandler } from '../../types/discordTypes/commandTypes';
import { delJson, getJson } from '../../utils/redisHelpers';
import { RedisKeys } from '../../types/redisKeys/keys';
import redis from '../../loaders/database/redisLoader';
import { EmbedBuilder } from 'discord.js';
import logger from '../../utils/logger';

const postInstanceDeleted: ButtonHandler = {
	customId: 'instdelete_accept',
	async execute(client, interaction) {
		const customId = interaction.customId.split('_');
		const instanceId = customId.slice(2).join('_');

		const instanceData = await getJson(redis, RedisKeys.pendingInstanceDelete(instanceId));
		const instance = instanceData as SanitizedInstance;
		const approvalMsgId = (instanceData as SanitizedInstance & { approvalMsgId?: string }).approvalMsgId;
		if (!instanceData) {
			await interaction.editReply({ content: 'Server not found or invalid data.' });
			return;
		}

		try {
			if (instance.WelcomeMessage === 'hidden') return;
			const [guildID, updatesChannelId, approvalsChannelId] = [process.env.GUILD_ID, process.env.UPDATES_CH, process.env.APPROVALS_CH];
			if (!guildID || !updatesChannelId || !approvalsChannelId) return;
			const guild = await client.guilds.fetch(guildID);
			const channel = await guild.channels.fetch(updatesChannelId);
			const approvalsChannel = await guild.channels.fetch(approvalsChannelId);
			if (!channel || !channel.isTextBased() || !approvalsChannel || !approvalsChannel.isTextBased()) return;

			const descriptionData = [`**Name**: ${instance.FriendlyName}`, `**Module**: ${instance.Module}`]
				.map((line) => line.trim())
				.filter((line) => line)
				.join('\n');

			const embed = new EmbedBuilder()
				.setTitle('Instance Deleted')
				.setDescription(descriptionData)
				.setFooter({ text: `${instance.InstanceID}` })
				.setThumbnail(instance.ServerIcon)
				.setColor(client.color)
				.setTimestamp();

			await channel.send({ embeds: [embed] });

			// Edit the original approval message to show confirmation and remove buttons
			if (approvalMsgId) {
				const approvalMsg = await approvalsChannel.messages.fetch(approvalMsgId);
				await approvalMsg.edit({
					content: `Deletion post for **${instance.FriendlyName}** has been approved and posted by <@${interaction.user.id}>!`,
					embeds: [],
					components: [],
				});
			}
			await interaction.deferUpdate();
			await delJson(redis, RedisKeys.pendingInstanceDelete(instanceId));
		} catch (error) {
			logger.error('Instance Deleted', `Error processing instance deletion event: ${error}`);
		}
	},
};

export default postInstanceDeleted;
