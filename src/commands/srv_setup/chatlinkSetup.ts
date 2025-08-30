import { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CommandData } from '../../types/discordTypes/commandTypes';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';
import { ExtendedInstance, ModuleTypeMap } from '../../types/ampTypes/ampTypes';
import { instanceLogin } from '../../utils/ampAPI/main';
import { ChatLinks } from '../../utils/ampAPI/schedulerJobs';
import { applySchedulerJobs, removeSchedulerJobs } from '../../utils/ampAPI/taskFuncs';
import { chatlinkModel } from '../../models/chatlink';

const chatlinkSetup: CommandData = {
	data: new SlashCommandBuilder()
		.setName('chatlink_setup')
		.setDescription('Replies with instance information.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addStringOption((opt) => opt.setName('instance').setDescription('The instance to get information about.').setRequired(true).setAutocomplete(true))
		.addChannelOption((opt) => opt.setName('channel').setDescription('The channel to send messages to.').setRequired(true)),
	state: 'enabled',
	devOnly: false,
	autoCompleteInstanceType: 'not_hidden',
	async execute(client, interaction) {
		interaction.deferReply();
		const instanceId = interaction.options.getString('instance');
		const instanceData = await getJson(redis, `instance:${instanceId}`);
		if (!instanceData) return interaction.reply({ content: 'Instance not found or invalid data.', flags: MessageFlags.Ephemeral });
		const instance = Array.isArray(instanceData) ? (instanceData[0] as ExtendedInstance) : (instanceData as ExtendedInstance);
		const moduleName = (instance.ModuleDisplayName || instance.Module) as keyof ModuleTypeMap;
		const instanceAPI = await instanceLogin(instance.InstanceID, moduleName);
		if (!instanceAPI) return interaction.reply({ content: 'Failed to login to instance API.', flags: MessageFlags.Ephemeral });

		// Create the Discord Webhook for the specified channel
		const channelOpt = interaction.options.getChannel('channel');
		const channel = await interaction.guild.channels.fetch(channelOpt.id);
		if (!channel || !channel.isTextBased()) return interaction.reply({ content: 'Invalid channel selected.', flags: MessageFlags.Ephemeral });
		const webhooks = await channel.fetchWebhooks();
		const existingWebhook = webhooks.find((w: any) => w.name === instanceId);

		// If the webhook doesn't exist, we should enable chatlink
		if (!existingWebhook) {
			const newWebhook = await channel.createWebhook({
				name: instanceId,
				avatar: interaction.guild.iconURL(),
			});

			const schedulerResult = await applySchedulerJobs(instance.InstanceID, moduleName, ChatLinks[moduleName]);

			await chatlinkModel
				.create({
					webhookId: newWebhook.id,
					webhookToken: newWebhook.token,
					channelId: channel.id,
					guildId: interaction.guild.id,
					instanceId: instance.InstanceID,
				})
				.then(() => {
					interaction.editReply({ content: `## Chat link setup completed!\n${schedulerResult.successMd}\n${schedulerResult.failureMd}`, flags: MessageFlags.Ephemeral });
				});
		} else {
			// If the webhook exists, we should disable chatlink
			await existingWebhook.delete('Chat link disabled via command.');
			const schedulerResult = await removeSchedulerJobs(instance.InstanceID, moduleName, ChatLinks[moduleName]);
			await chatlinkModel.deleteOne({ webhookId: existingWebhook.id });
			interaction.editReply({ content: `## Chat link disabled successfully!\n${schedulerResult.successMd}\n${schedulerResult.failureMd}`, flags: MessageFlags.Ephemeral });
		}
	},
};

export default chatlinkSetup;
