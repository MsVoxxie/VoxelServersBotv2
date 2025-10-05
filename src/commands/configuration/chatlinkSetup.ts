import { PermissionFlagsBits, SlashCommandBuilder, MessageFlags, EmbedBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { applySchedulerJobs, removeSchedulerJobs } from '../../utils/ampAPI/taskFuncs';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { chatlinkJobs } from '../../utils/schedulerJobs/chatlinkJobs';
import { CommandData } from '../../types/discordTypes/commandTypes';
import { ModuleTypeMap } from '../../types/ampTypes/ampTypes';
import { instanceLogin } from '../../utils/ampAPI/mainFuncs';
import redis from '../../loaders/database/redisLoader';
import { chatlinkModel } from '../../models/chatlink';
import { getJson } from '../../utils/redisHelpers';
import logger from '../../utils/logger';

const chatlinkSetup: CommandData = {
	data: new SlashCommandBuilder()
		.setName('chatlink_setup')
		.setDescription('Enable or disable chatlink for an instance in a specified channel.')
		.addStringOption((opt) => opt.setName('instance').setDescription('The instance to get information about.').setRequired(true).setAutocomplete(true))
		.addChannelOption((opt) => opt.setName('channel').setDescription('The channel to send messages to.').setRequired(true))
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
		.setContexts([InteractionContextType.Guild])
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
	state: 'enabled',
	devOnly: false,
	autoCompleteInstanceType: 'running',
	async execute(client, interaction) {
		try {
			await interaction.deferReply();
			const instanceId = interaction.options.getString('instance');
			const instanceData = await getJson(redis, `instance:${instanceId}`);
			if (!instanceData) return interaction.editReply({ content: 'Instance not found or invalid data.', flags: MessageFlags.Ephemeral });
			const instance = instanceData as SanitizedInstance;
			const moduleName = (instance.Module || 'GenericModule') as keyof ModuleTypeMap;
			const instanceAPI = await instanceLogin(instance.InstanceID, moduleName);
			if (!instanceAPI) return interaction.editReply({ content: 'Failed to login to instance API.', flags: MessageFlags.Ephemeral });

			// Create the Discord Webhook for the specified channel
			const channelOpt = interaction.options.getChannel('channel');
			const channel = await interaction.guild.channels.fetch(channelOpt.id);
			if (!channel || !channel.isTextBased()) return interaction.editReply({ content: 'Invalid channel selected.', flags: MessageFlags.Ephemeral });
			const webhooks = await channel.fetchWebhooks();
			const existingWebhook = webhooks.find((w: any) => w.name === instanceId);

			// If the webhook doesn't exist, we should enable chatlink
			if (!existingWebhook) {
				const newWebhook = await channel.createWebhook({
					name: instanceId,
					avatar: interaction.guild.iconURL({ size: 1024, extension: 'png', forceStatic: true }),
				});

				const rawJobs = chatlinkJobs[moduleName as keyof typeof chatlinkJobs];
				if (!rawJobs) return interaction.editReply({ content: 'No scheduler jobs defined for this module.', flags: MessageFlags.Ephemeral });
				const jobs = Array.isArray(rawJobs) ? rawJobs : [rawJobs];
				const schedulerResult = await applySchedulerJobs(instance.InstanceID, moduleName, jobs as any);

				await chatlinkModel
					.create({
						webhookId: newWebhook.id,
						webhookToken: newWebhook.token,
						channelId: channel.id,
						guildId: interaction.guild.id,
						instanceId: instance.InstanceID,
					})
					.then(() => {
						const embed = new EmbedBuilder()
							.setColor(client.color)
							.setTitle('Chatlink Setup')
							.setDescription(`${instance.FriendlyName}'s Chatlink has been linked to ${channel.url}.\n${chatlinkListMD(schedulerResult, 'add')}`)
							.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`)
							.setThumbnail(interaction.guild.iconURL({ size: 1024, extension: 'png', forceStatic: true }));

						interaction.editReply({
							embeds: [embed],
							flags: MessageFlags.Ephemeral,
						});
					});
			} else {
				// If the webhook exists, we should disable chatlink
				await existingWebhook.delete('Chat link disabled via command.');
				const schedulerResult = await removeSchedulerJobs(instance.InstanceID, moduleName, chatlinkJobs[moduleName]);
				await chatlinkModel.deleteOne({ webhookId: existingWebhook.id }).then(() => {
					const embed = new EmbedBuilder()
						.setColor(client.color)
						.setTitle('Chatlink Setup')
						.setDescription(`${instance.FriendlyName}'s Chatlink has been unlinked from ${channel.url}.\n${chatlinkListMD(schedulerResult, 'remove')}`)
						.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`)
						.setThumbnail(interaction.guild.iconURL({ size: 1024, extension: 'png', forceStatic: true }));

					interaction.editReply({
						embeds: [embed],
						flags: MessageFlags.Ephemeral,
					});
				});
			}
		} catch (error) {
			logger.error('Chatlink Setup', `Error occurred during chatlink setup: ${error}`);
			interaction.editReply({ content: 'An error occurred while setting up chatlink. Please try again later.', flags: MessageFlags.Ephemeral });
		}
	},
};

function chatlinkListMD(schedulerResult: any, type: 'add' | 'remove') {
	let md: string;
	let success: string;
	let failed: string;

	switch (type) {
		case 'add':
			success = `- Successfully added **${schedulerResult.successTriggers.length}** Triggers\n  - Successfully added **${schedulerResult.successTasks.length}** tasks.`;
			failed = `- Failed to add **${schedulerResult.failedTriggers.length}** Triggers\n  - Failed to add **${schedulerResult.failedTasks.length}** tasks.`;
			md = `\n${success}\n\n${failed}`;
			break;

		case 'remove':
			success = `- Successfully removed **${schedulerResult.successTriggers.length}** Triggers\n  - Successfully removed **${schedulerResult.successTasks.length}** tasks.`;
			failed = `- Failed to remove **${schedulerResult.failedTriggers.length}** Triggers\n  - Failed to remove **${schedulerResult.failedTasks.length}** tasks.`;
			md = `\n${success}\n\n${failed}`;
			break;
	}
	return md;
}

export default chatlinkSetup;
