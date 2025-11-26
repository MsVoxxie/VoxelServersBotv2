import { PermissionFlagsBits, SlashCommandBuilder, MessageFlags, ApplicationIntegrationType, InteractionContextType, EmbedBuilder } from 'discord.js';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { CommandData } from '../../types/discordTypes/commandTypes';
import { getJson, mergeJson } from '../../utils/redisHelpers';
import { RedisKeys } from '../../types/redisKeys/keys';
import redis from '../../loaders/database/redisLoader';
import logger from '../../utils/logger';

const manageInstanceAllowances: CommandData = {
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
				.addStringOption((opt) =>
					opt.setName('permissions').setDescription('Comma-separated list of permissions to grant (all, start, stop,restart, rcon)').setRequired(false)
				)
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

			// parse permissions string into the allowancePermissions shape
			const parsePermissions = (permStr: string | null | undefined) => {
				const perms = { start: false, stop: false, restart: false, rcon: false };
				if (!permStr) return perms;
				permStr
					.split(',')
					.map((s) => s.trim().toLowerCase())
					.forEach((p) => {
						if (p === 'all') {
							perms.start = true;
							perms.stop = true;
							perms.restart = true;
							perms.rcon = true;
						}
						if (p === 'start') perms.start = true;
						if (p === 'stop') perms.stop = true;
						if (p === 'restart') perms.restart = true;
						if (p === 'rcon') perms.rcon = true;
					});
				return perms;
			};
			const permissions = parsePermissions(interaction.options.getString('permissions'));

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
							allowDiscordIntegration: true,
							allowedDiscordRoles: [],
							allowedDiscordUsers: [],
						};
					}

					// Ensure the arrays exist
					instance.DiscordAllowances.allowedDiscordRoles = instance.DiscordAllowances.allowedDiscordRoles ?? [];
					instance.DiscordAllowances.allowedDiscordUsers = instance.DiscordAllowances.allowedDiscordUsers ?? [];

					if (allowedRole) {
						const existing = instance.DiscordAllowances.allowedDiscordRoles.find((r) => r.roleId === allowedRole!.id);
						if (!existing) {
							instance.DiscordAllowances.allowedDiscordRoles.push({ roleId: allowedRole!.id, allowedPermissions: permissions });
						} else {
							existing.allowedPermissions = { ...existing.allowedPermissions, ...permissions };
						}
					}
					if (allowedUser) {
						const existing = instance.DiscordAllowances.allowedDiscordUsers.find((u) => u.userId === allowedUser!.id);
						if (!existing) {
							instance.DiscordAllowances.allowedDiscordUsers.push({ userId: allowedUser!.id, allowedPermissions: permissions });
						} else {
							existing.allowedPermissions = { ...existing.allowedPermissions, ...permissions };
						}
					} // Track changes made
					if (allowedRole) {
						changesMade.push(['Role Added', `<@&${allowedRole!.id}>`]);
						changesMade.push([
							'Permissions',
							Object.entries(permissions)
								.filter(([_, v]) => v)
								.map(([k, _]) => k)
								.join(', ') || 'None',
						]);
					}
					if (allowedUser) {
						changesMade.push(['User Added', `<@${allowedUser!.id}>`]);
						changesMade.push([
							'Permissions',
							Object.entries(permissions)
								.filter(([_, v]) => v)
								.map(([k, _]) => k)
								.join(', ') || 'None',
						]);
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
						instance.DiscordAllowances.allowedDiscordRoles = instance.DiscordAllowances.allowedDiscordRoles.filter((r) => r.roleId !== allowedRole!.id);
					}
					if (allowedUser?.id) {
						instance.DiscordAllowances.allowedDiscordUsers = instance.DiscordAllowances.allowedDiscordUsers.filter((u) => u.userId !== allowedUser!.id);
					} // Track changes made
					if (allowedRole) {
						changesMade.push(['Role Removed', `<@&${allowedRole!.id}>`]);
					}
					if (allowedUser) {
						changesMade.push(['User Removed', `<@${allowedUser!.id}>`]);
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

export default manageInstanceAllowances;
