import { PermissionFlagsBits, SlashCommandBuilder, MessageFlags, EmbedBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { AppState, ExtendedInstance, ModuleTypeMap } from '../../types/ampTypes/ampTypes';
import { CommandData } from '../../types/discordTypes/commandTypes';
import { instanceLogin } from '../../utils/ampAPI/mainFuncs';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';

const manageServers: CommandData = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setDescription('Various server management commands.')
		.addSubcommand((sc) =>
			sc
				.setName('stop')
				.setDescription('Stops a server')
				.addStringOption((opt) => opt.setName('server').setDescription('The server to stop.').setRequired(true).setAutocomplete(true))
		)
		.addSubcommand((sc) =>
			sc
				.setName('start')
				.setDescription('Starts a server')
				.addStringOption((opt) => opt.setName('server').setDescription('The server to start.').setRequired(true).setAutocomplete(true))
		)
		.addSubcommand((sc) =>
			sc
				.setName('restart')
				.setDescription('Restarts a server')
				.addStringOption((opt) => opt.setName('server').setDescription('The server to restart.').setRequired(true).setAutocomplete(true))
		)
		.addSubcommand((sc) =>
			sc
				.setName('update')
				.setDescription('Updates a server')
				.addStringOption((opt) => opt.setName('server').setDescription('The server to update.').setRequired(true).setAutocomplete(true))
		)
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
		.setContexts([InteractionContextType.Guild, InteractionContextType.PrivateChannel])
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
	state: 'enabled',
	devOnly: false,
	autoCompleteInstanceType: 'running',
	async execute(client, interaction) {
		try {
			await interaction.deferReply();
			const subcommand = interaction.options.getSubcommand();
			const instanceId = interaction.options.getString('server');
			const instanceData = await getJson(redis, `instance:${instanceId}`);
			if (!instanceData) return interaction.editReply({ content: 'Instance not found or invalid data.', flags: MessageFlags.Ephemeral });
			const instance = instanceData as ExtendedInstance;
			const moduleName = (instance.Module || 'GenericModule') as keyof ModuleTypeMap;
			const instanceAPI = await instanceLogin(instance.InstanceID, moduleName);
			if (!instanceAPI) return interaction.editReply({ content: 'Failed to login to instance API.', flags: MessageFlags.Ephemeral });
			let res;

			// Switch case for subcommands
			switch (subcommand) {
				case 'start': {
					if (instance.AppState !== AppState.Stopped) return interaction.editReply({ content: `${instance.FriendlyName} is not stopped.`, flags: MessageFlags.Ephemeral });
					res = await instanceAPI.Core.Start();
					interaction.editReply({ content: `**${instance.FriendlyName}** ${res.Status ? 'started successfully.' : 'failed to start.'}`, flags: MessageFlags.Ephemeral });
					break;
				}
				case 'stop': {
					if (!instance.Running) return interaction.editReply({ content: `${instance.FriendlyName} is not running.`, flags: MessageFlags.Ephemeral });
					await instanceAPI.Core.Stop();
					interaction.editReply({ content: `**${instance.FriendlyName}** has been requested to stop.`, flags: MessageFlags.Ephemeral });
					break;
				}
				case 'restart': {
					if (!instance.Running) return interaction.editReply({ content: `${instance.FriendlyName} is not running.`, flags: MessageFlags.Ephemeral });
					res = await instanceAPI.Core.Restart();
					interaction.editReply({ content: `**${instance.FriendlyName}** ${res.Status ? 'restarted successfully.' : 'failed to restart.'}`, flags: MessageFlags.Ephemeral });
					break;
				}
				case 'update': {
					res = await instanceAPI.Core.UpdateApplication();
					interaction.editReply({ content: `**${instance.FriendlyName}** ${res.Status ? 'updated successfully.' : 'failed to update.'}`, flags: MessageFlags.Ephemeral });
					break;
				}
				default:
					interaction.editReply({ content: 'Invalid subcommand.', flags: MessageFlags.Ephemeral });
			}
		} catch (error) {}
	},
};

export default manageServers;
