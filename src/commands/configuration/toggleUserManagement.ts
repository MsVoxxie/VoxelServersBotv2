import { PermissionFlagsBits, SlashCommandBuilder, MessageFlags, ApplicationIntegrationType, InteractionContextType, EmbedBuilder } from 'discord.js';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { CommandData } from '../../types/discordTypes/commandTypes';
import { getJson, mergeJson } from '../../utils/redisHelpers';
import { RedisKeys } from '../../types/redisKeys/keys';
import redis from '../../loaders/database/redisLoader';
import logger from '../../utils/logger';

const toggleUserManagement: CommandData = {
	data: new SlashCommandBuilder()
		.setName('instance_allowances')
		.setDescription('Configure instance allowances settings.')
		.addSubcommand((subcmd) =>
			subcmd
				.setName('toggle')
				.setDescription('Enable or disable instance allowances for an instance.')
				.addStringOption((opt) => opt.setName('instance').setDescription('The instance to toggle instance allowances for.').setRequired(true).setAutocomplete(true))
				.addBooleanOption((opt) => opt.setName('toggle').setDescription('Enable or disable instance allowances.').setRequired(true))
		)
		.addSubcommand((subcmd) =>
			subcmd
				.setName('add')
				.setDescription('Add allowed role/user for managing the instance.')
				.addStringOption((opt) => opt.setName('instance').setDescription('The instance to configure user management for.').setRequired(true).setAutocomplete(true))
				.addRoleOption((opt) => opt.setName('allowed_role').setDescription('The role allowed to manage this instance').setRequired(false))
				.addUserOption((opt) => opt.setName('allowed_user').setDescription('The user allowed to manage this instance').setRequired(false))
		)
		.addSubcommand((subcmd) =>
			subcmd
				.setName('remove')
				.setDescription('Remove allowed role/user for managing the instance.')
				.addStringOption((opt) => opt.setName('instance').setDescription('The instance to configure user management for.').setRequired(true).setAutocomplete(true))
				.addRoleOption((opt) => opt.setName('allowed_role').setDescription('The role allowed to manage this instance').setRequired(false))
				.addUserOption((opt) => opt.setName('allowed_user').setDescription('The user allowed to manage this instance').setRequired(false))
		)
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
		.setContexts([InteractionContextType.Guild])
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
	state: 'enabled',
	devOnly: true,
	autoCompleteInstanceType: 'running',
	async execute(client, interaction) {
		try {
			await interaction.deferReply();
			const subcommand = interaction.options.getSubcommand();
			const instanceId = interaction.options.getString('instance', true);

			// Define variables
			let toggle: boolean;
			let allowedRole: { id: string } | null = null;
			let allowedUser: { id: string } | null = null;
			let changesMade: [string, string][] = [];
			const instance = await getJson<SanitizedInstance>(redis, RedisKeys.instance(instanceId));
			if (!instance) return interaction.editReply({ content: 'Instance not found.', flags: MessageFlags.Ephemeral });

			// Do logic!
			switch (subcommand) {
				case 'toggle':
					toggle = interaction.options.getBoolean('toggle', true);
					if (!instance) return interaction.editReply({ content: 'Instance not found.', flags: MessageFlags.Ephemeral });

					// Ensure DiscordAllowances exists
					if (!instance.DiscordAllowances) {
						instance.DiscordAllowances = {
							allowDiscordIntegration: false,
							allowedDiscordRoles: [],
							allowedDiscordUsers: [],
						};
					}

					// assign new values
					instance.DiscordAllowances.allowDiscordIntegration = !!toggle;
					instance.DiscordAllowances.allowedDiscordRoles = [];
					instance.DiscordAllowances.allowedDiscordUsers = [];

					// Track changes made
					changesMade.push(['User Allowances:', toggle ? 'Enabled' : 'Disabled']);

					await mergeJson<SanitizedInstance>(redis, RedisKeys.instance(instanceId), instance);
					break;

				case 'add':
					allowedRole = interaction.options.getRole('allowed_role');
					allowedUser = interaction.options.getUser('allowed_user');
					if (!instance) return interaction.editReply({ content: 'Instance not found.', flags: MessageFlags.Ephemeral });

					// Ensure DiscordAllowances exists
					if (!instance.DiscordAllowances) {
						instance.DiscordAllowances = {
							allowDiscordIntegration: false,
							allowedDiscordRoles: [],
							allowedDiscordUsers: [],
						};
					}

					// Ensure the arrays exist to satisfy the type checker
					instance.DiscordAllowances.allowedDiscordRoles = instance.DiscordAllowances.allowedDiscordRoles ?? [];
					instance.DiscordAllowances.allowedDiscordUsers = instance.DiscordAllowances.allowedDiscordUsers ?? [];

					if (allowedRole && !instance.DiscordAllowances.allowedDiscordRoles.includes(Number(allowedRole.id))) {
						instance.DiscordAllowances.allowedDiscordRoles.push(Number(allowedRole.id));
					}
					if (allowedUser && !instance.DiscordAllowances.allowedDiscordUsers.includes(Number(allowedUser.id))) {
						instance.DiscordAllowances.allowedDiscordUsers.push(Number(allowedUser.id));
					}

					// Track changes made
					if (allowedRole) {
						changesMade.push(['Role Added', `<@&${allowedRole.id}>`]);
					}
					if (allowedUser) {
						changesMade.push(['User Added', `<@${allowedUser.id}>`]);
					}

					await mergeJson<SanitizedInstance>(redis, RedisKeys.instance(instanceId), instance);
					break;

				case 'remove':
					allowedRole = interaction.options.getRole('allowed_role');
					allowedUser = interaction.options.getUser('allowed_user');
					if (!instance) return interaction.editReply({ content: 'Instance not found.', flags: MessageFlags.Ephemeral });

					// Ensure DiscordAllowances exists
					if (!instance.DiscordAllowances) {
						instance.DiscordAllowances = {
							allowDiscordIntegration: false,
							allowedDiscordRoles: [],
							allowedDiscordUsers: [],
						};
					}

					// Ensure the arrays exist to satisfy the type checker
					instance.DiscordAllowances.allowedDiscordRoles = instance.DiscordAllowances.allowedDiscordRoles ?? [];
					instance.DiscordAllowances.allowedDiscordUsers = instance.DiscordAllowances.allowedDiscordUsers ?? [];

					if (allowedRole) {
						const roleIdToRemove = Number(allowedRole.id);
						instance.DiscordAllowances.allowedDiscordRoles = instance.DiscordAllowances.allowedDiscordRoles.filter((roleId) => roleId !== roleIdToRemove);
					}
					if (allowedUser) {
						const userIdToRemove = Number(allowedUser.id);
						instance.DiscordAllowances.allowedDiscordUsers = instance.DiscordAllowances.allowedDiscordUsers.filter((userId) => userId !== userIdToRemove);
					}

					// Track changes made
					if (allowedRole) {
						changesMade.push(['Role Removed', `<@&${allowedRole.id}>`]);
					}
					if (allowedUser) {
						changesMade.push(['User Removed', `<@${allowedUser.id}>`]);
					}

					await mergeJson<SanitizedInstance>(redis, RedisKeys.instance(instanceId), instance);
					break;
			}

			// Create response message
			const embed = new EmbedBuilder()
				.setTitle(`${instance.FriendlyName} Allowances Updated`)
				.addFields(changesMade.map(([change, value]) => ({ name: change, value: value, inline: true })))
				.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`)
				.setThumbnail(instance.ServerIcon)
				.setColor(client.color);
			return interaction.editReply({ embeds: [embed] });
		} catch (error) {
			logger.error('Error executing toggleUserManagement command:', error);
			return interaction.editReply({ content: 'An error occurred while executing the command.', flags: MessageFlags.Ephemeral });
		}
	},
};

export default toggleUserManagement;
