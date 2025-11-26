import { PermissionFlagsBits, SlashCommandBuilder, MessageFlags, EmbedBuilder, ApplicationIntegrationType, InteractionContextType, codeBlock } from 'discord.js';
import { sendServerConsoleCommand } from '../../utils/ampAPI/instanceFuncs';
import { AppState, ModuleTypeMap } from '../../types/ampTypes/ampTypes';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { CommandData } from '../../types/discordTypes/commandTypes';
import { instanceLogin } from '../../utils/ampAPI/apiFuncs';
import { RedisKeys } from '../../types/redisKeys/keys';
import redis from '../../loaders/database/redisLoader';
import { trimString, wait } from '../../utils/utils';
import { getJson } from '../../utils/redisHelpers';
import logger from '../../utils/logger';

const allowanceCommands: CommandData = {
	data: new SlashCommandBuilder()
		.setName('allowance')
		.setDescription('Various server management commands.')
		.addSubcommand((sc) =>
			sc
				.setName('rcon')
				.setDescription('Sends a command to the server console via RCON')
				.addStringOption((opt) => opt.setName('server').setDescription('The server to send the command to.').setRequired(true).setAutocomplete(true))
				.addStringOption((opt) => opt.setName('command').setDescription('The command to send to the server console.').setRequired(true))
				.addBooleanOption((opt) => opt.setName('verbose').setDescription('Whether to return the console output from the command. Defaults to true.').setRequired(false))
		)
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
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
		.setContexts([InteractionContextType.Guild])
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	state: 'enabled',
	devOnly: false,
	autoCompleteInstanceType: 'running',
	async execute(client, interaction) {
		try {
			await interaction.deferReply();
			const subcommand = interaction.options.getSubcommand();
			const instanceId = interaction.options.getString('server');
			const instanceData = await getJson(redis, RedisKeys.instance(instanceId));
			if (!instanceData) return interaction.editReply({ content: 'Instance not found or invalid data.', flags: MessageFlags.Ephemeral });
			const instance = instanceData as SanitizedInstance;
			const moduleName = (instance.Module || 'GenericModule') as keyof ModuleTypeMap;
			const instanceAPI = await instanceLogin(instance.InstanceID, moduleName);
			if (!instanceAPI) return interaction.editReply({ content: 'Failed to login to instance API.', flags: MessageFlags.Ephemeral });
			const userRoles = interaction.member.roles.cache.map((r: any) => r.id);
			const userId = interaction.member.id;
			let allowedCommands: string[] = [];
			let res: any;

			// Check allowances for the user
			if (userId === process.env.DEV_ID) {
				allowedCommands = ['restart', 'stop', 'start', 'rcon'];
			}

			if (instance.DiscordAllowances && instance.DiscordAllowances.allowDiscordIntegration) {
				// Check role allowances
				if (instance.DiscordAllowances.allowedDiscordRoles) {
					for (const allowedRole of instance.DiscordAllowances.allowedDiscordRoles) {
						if (userRoles.includes(allowedRole.roleId)) {
							const perms = allowedRole.allowedPermissions;
							for (const [key, enabled] of Object.entries(perms)) {
								if (enabled && !allowedCommands.includes(key)) allowedCommands.push(key);
							}
						}
					}
				}
				// Check user allowances
				if (instance.DiscordAllowances.allowedDiscordUsers) {
					const allowedUser = instance.DiscordAllowances.allowedDiscordUsers.find((u) => u.userId === userId);
					if (allowedUser) {
						const perms = allowedUser.allowedPermissions;
						for (const [key, enabled] of Object.entries(perms)) {
							if (enabled && !allowedCommands.includes(key)) allowedCommands.push(key);
						}
					}
				}
			}

			console.log(allowedCommands);

			// Switch case for subcommands
			switch (subcommand) {
				case 'rcon': {
					if (!allowedCommands.includes('rcon'))
						return interaction.editReply({ content: 'You do not have permission to use RCON on this instance.', flags: MessageFlags.Ephemeral });
					const command = interaction.options.getString('command', true);
					const verbose = interaction.options.getBoolean('verbose') ?? true;
					if (!command || command.trim().length === 0) return interaction.editReply({ content: 'Command cannot be empty.', flags: MessageFlags.Ephemeral });
					if (instance.AppState !== AppState.Running) return interaction.editReply({ content: `${instance.FriendlyName} is not running.`, flags: MessageFlags.Ephemeral });
					res = await sendServerConsoleCommand(instance.InstanceID, moduleName, command, { returnResult: verbose });
					if (!verbose) return interaction.editReply({ content: `Command sent to ${instance.FriendlyName}.`, flags: MessageFlags.Ephemeral });

					const embed = new EmbedBuilder()
						.setTitle(`RCON Command Executed on ${instance.FriendlyName}`)
						.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`)
						.addFields({
							name: '📥 Command',
							value: codeBlock('js', command),
							inline: true,
						})
						.addFields({
							name: '📤 Result',
							value: codeBlock('js', trimString(res?.data || 'No output.', 812)),
						})
						.setColor(client.color)
						.setTimestamp();

					interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
					break;
				}
				case 'start': {
					if (!allowedCommands.includes('start'))
						return interaction.editReply({ content: 'You do not have permission to start this instance.', flags: MessageFlags.Ephemeral });
					if (instance.AppState !== AppState.Stopped) return interaction.editReply({ content: `${instance.FriendlyName} is not stopped.`, flags: MessageFlags.Ephemeral });
					res = await instanceAPI.Core.Start();
					interaction.editReply({ content: `**${instance.FriendlyName}** ${res.Status ? 'started successfully.' : 'failed to start.'}`, flags: MessageFlags.Ephemeral });
					break;
				}
				case 'stop': {
					if (!allowedCommands.includes('stop')) return interaction.editReply({ content: 'You do not have permission to stop this instance.', flags: MessageFlags.Ephemeral });
					if (instance.AppState !== AppState.Running) return interaction.editReply({ content: `${instance.FriendlyName} is not running.`, flags: MessageFlags.Ephemeral });
					instanceAPI.Core.Stop();
					await wait(2000);
					await instanceAPI.Core.Stop();
					interaction.editReply({ content: `**${instance.FriendlyName}** has been requested to stop.`, flags: MessageFlags.Ephemeral });
					break;
				}
				case 'restart': {
					if (!allowedCommands.includes('restart'))
						return interaction.editReply({ content: 'You do not have permission to restart this instance.', flags: MessageFlags.Ephemeral });
					if (instance.AppState !== AppState.Running) return interaction.editReply({ content: `${instance.FriendlyName} is not running.`, flags: MessageFlags.Ephemeral });
					res = await instanceAPI.Core.Restart();
					interaction.editReply({ content: `**${instance.FriendlyName}** ${res.Status ? 'restarted successfully.' : 'failed to restart.'}`, flags: MessageFlags.Ephemeral });
					break;
				}
				default:
					interaction.editReply({ content: 'Invalid subcommand.', flags: MessageFlags.Ephemeral });
			}
		} catch (error) {
			logger.error('Error executing manageServers command:', error);
			return interaction.editReply({ content: 'An error occurred while executing the command.', flags: MessageFlags.Ephemeral });
		}
	},
};

export default allowanceCommands;
