import { PermissionFlagsBits, SlashCommandBuilder, MessageFlags, EmbedBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { CommandData } from '../../types/discordTypes/commandTypes';
import { apiLogin } from '../../utils/ampAPI/apiFuncs';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';

const manageInstances: CommandData = {
	data: new SlashCommandBuilder()
		.setName('instance')
		.setDescription('Various instance management commands.')
		.addSubcommand((sc) =>
			sc
				.setName('stop')
				.setDescription('Stops an instance')
				.addStringOption((opt) => opt.setName('instance').setDescription('The instance to stop.').setRequired(true).setAutocomplete(true))
		)
		.addSubcommand((sc) =>
			sc
				.setName('start')
				.setDescription('Starts an instance')
				.addStringOption((opt) => opt.setName('instance').setDescription('The instance to start.').setRequired(true).setAutocomplete(true))
		)
		.addSubcommand((sc) =>
			sc
				.setName('restart')
				.setDescription('Restarts an instance')
				.addStringOption((opt) => opt.setName('instance').setDescription('The instance to restart.').setRequired(true).setAutocomplete(true))
		)
		.addSubcommand((sc) =>
			sc
				.setName('update')
				.setDescription('Updates an instance')
				.addStringOption((opt) => opt.setName('instance').setDescription('The instance to update.').setRequired(true).setAutocomplete(true))
		)
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
		.setContexts([InteractionContextType.Guild, InteractionContextType.PrivateChannel])
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
	state: 'enabled',
	devOnly: true,
	autoCompleteInstanceType: 'all',
	async execute(client, interaction) {
		try {
			await interaction.deferReply();
			const API = await apiLogin();
			if (!API) return interaction.editReply({ content: 'Failed to connect to server API.', flags: MessageFlags.Ephemeral });
			const instanceId = interaction.options.getString('instance');
			const subcommand = interaction.options.getSubcommand();
			const instanceData = await getJson(redis, `instance:${instanceId}`);
			if (!instanceData) return interaction.editReply({ content: 'Instance data not found.', flags: MessageFlags.Ephemeral });
			const instance = instanceData as SanitizedInstance;
			if (!instance) return interaction.editReply({ content: 'Instance data not found.', flags: MessageFlags.Ephemeral });

			// Switch case for subcommands
			switch (subcommand) {
				case 'start': {
					if (instance.Running) return interaction.editReply({ content: `**${instance.FriendlyName}** is already running.`, flags: MessageFlags.Ephemeral });
					await API.ADSModule.StartInstance(instance.InstanceName);
					interaction.editReply({ content: `Starting **${instance.FriendlyName}**...`, flags: MessageFlags.Ephemeral });
					break;
				}
				case 'stop': {
					if (!instance.Running) return interaction.editReply({ content: `**${instance.FriendlyName}** is not running.`, flags: MessageFlags.Ephemeral });
					await API.ADSModule.StopInstance(instance.InstanceName);
					interaction.editReply({ content: `Stopping **${instance.FriendlyName}**...`, flags: MessageFlags.Ephemeral });
					break;
				}
				case 'restart': {
					if (!instance.Running) return interaction.editReply({ content: `**${instance.FriendlyName}** is not running.`, flags: MessageFlags.Ephemeral });
					await API.ADSModule.RestartInstance(instance.InstanceName);
					interaction.editReply({ content: `Restarting **${instance.FriendlyName}**...`, flags: MessageFlags.Ephemeral });
					break;
				}
				case 'update': {
					await API.ADSModule.UpgradeInstance(instance.InstanceName);
					interaction.editReply({ content: `Updating **${instance.FriendlyName}**...`, flags: MessageFlags.Ephemeral });
					break;
				}
				default:
					interaction.editReply({ content: 'Invalid subcommand.', flags: MessageFlags.Ephemeral });
			}
		} catch (error) {}
	},
};

export default manageInstances;
