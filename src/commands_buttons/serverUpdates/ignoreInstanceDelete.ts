import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { ButtonHandler } from '../../types/discordTypes/commandTypes';
import { deleteServerRole } from '../../utils/discord/instanceRoles';
import { delJson, getJson } from '../../utils/redisHelpers';
import { RedisKeys } from '../../types/redisKeys/keys';
import redis from '../../loaders/database/redisLoader';
import logger from '../../utils/logger';

const ignoreInstanceDeleted: ButtonHandler = {
	customId: 'instdelete_ignore',
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

		// Delete server role
		try {
			await deleteServerRole(interaction, instance.InstanceID);
		} catch (error) {
			logger.error('Instance Deleted', `Error deleting server role for instance ${instance.InstanceID}: ${error}`);
		}

		// Handle ignoring the deletion message
		try {
			if (instance.WelcomeMessage === 'hidden') return;
			const [guildID, updatesChannelId, approvalsChannelId] = [process.env.GUILD_ID, process.env.UPDATES_CH, process.env.APPROVALS_CH];
			if (!guildID || !updatesChannelId || !approvalsChannelId) return;
			const guild = await client.guilds.fetch(guildID);
			const channel = await guild.channels.fetch(updatesChannelId);
			const approvalsChannel = await guild.channels.fetch(approvalsChannelId);
			if (!channel || !channel.isTextBased() || !approvalsChannel || !approvalsChannel.isTextBased()) return;

			// Edit the original approval message to show confirmation and remove buttons
			if (approvalMsgId) {
				const approvalMsg = await approvalsChannel.messages.fetch(approvalMsgId);
				await approvalMsg.edit({
					content: `Deletion post for **${instance.FriendlyName}** has been ignored by <@${interaction.user.id}>.`,
					embeds: [],
					components: [],
				});
			}
			await delJson(redis, RedisKeys.pendingInstanceDelete(instanceId));
			await interaction.deferUpdate();
		} catch (error) {
			logger.error('Instance Created', `Error processing instance created event: ${error}`);
		}
	},
};

export default ignoreInstanceDeleted;
