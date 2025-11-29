import { Client, EmbedBuilder, MessageFlags, SlashCommandBuilder, PermissionFlagsBits, ApplicationIntegrationType } from 'discord.js';
import { CommandData } from '../../types/discordTypes/commandTypes';
import { formatMCUUID } from '../../utils/utils';
import { UserData } from '../../models/userData';
import logger from '../../utils/logger';

const registerUser: CommandData = {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDescription('Link your Minecraft and Steam accounts to our servers.')
		.addStringOption((option) => option.setName('minecraft_username').setDescription('Your Minecraft username (Case Sensitive)').setRequired(false))
		.addStringOption((option) => option.setName('steam_url').setDescription('Your Steam profile URL (if applicable)').setRequired(false))
		.addBooleanOption((option) => option.setName('chatlink').setDescription('Would you like to opt OUT of chat link? (TRUE/FALSE)').setRequired(false))
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	state: 'enabled',
	devOnly: false,
	async execute(client: Client, interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const userId = interaction.user.id;
		const guildId = interaction.guild?.id;

		const mcUsername = interaction.options.getString('minecraft_username');
		const steamUrl = interaction.options.getString('steam_url');
		const chatlinkOptOut = interaction.options.getBoolean('chatlink') ?? false;

		let steamId: string | undefined;
		let mcUUID: string | undefined;

		// Lookup Steam64 ID from profile URL
		if (steamUrl) {
			try {
				const steamIdMatch = steamUrl.match(/steamcommunity\.com\/profiles\/(\d+)/);
				if (steamIdMatch) {
					steamId = steamIdMatch[1];
				} else {
					// If vanity URL, resolve to Steam64 via API
					const vanityMatch = steamUrl.match(/steamcommunity\.com\/id\/([^\/]+)/);
					if (vanityMatch) {
						const vanity = vanityMatch[1];
						const res = await fetch(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${process.env.STEAM_API_KEY}&vanityurl=${vanity}`);
						const data = await res.json();
						if (data.response.success === 1) {
							steamId = data.response.steamid;
						}
					}
				}
			} catch (err) {
				logger.error('Steam lookup failed:', err);
			}
		}

		// Lookup Minecraft UUID from username
		if (mcUsername) {
			try {
				const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${mcUsername}`);
				if (res.ok) {
					const data = await res.json();
					mcUUID = formatMCUUID(data.id);
				}
			} catch (err) {
				logger.error('Minecraft lookup failed:', err);
			}
		}

		// Upsert user data
		try {
			await UserData.findOneAndUpdate(
				{ userId },
				{
					guildId,
					userId,
					minecraft: mcUsername ? { username: mcUsername, uuid: mcUUID } : undefined,
					steam: steamId ? { steamId, profileUrl: steamUrl } : undefined,
					chatlinkOptOut,
				},
				{ upsert: true, new: true }
			);
		} catch (err) {
			logger.error('UserData upsert failed:', err);
			return interaction.editReply({ content: 'Failed to save your data. Please try again later.', flags: MessageFlags.Ephemeral });
		}

		// Confirmation embed
		const embed = new EmbedBuilder()
			.setTitle('Registration Complete')
			.setDescription('Your accounts have been linked!')
			.setColor(client.color)
			.addFields([
				{
					name: 'Minecraft',
					value: mcUsername ? `Username: ${mcUsername}\nUUID: ${mcUUID ?? 'Not found'}` : 'Not provided',
				},
				{
					name: 'Steam',
					value: steamId ? `Steam64: ${steamId}\nProfile: ${steamUrl}` : 'Not provided',
				},
				{
					name: 'Chatlink Opt-Out',
					value: chatlinkOptOut ? 'Opted Out' : 'Opted In',
				},
			]);

		// If neither account provided
		if (!mcUsername && !steamId)
			return interaction.editReply({ content: 'You must provide at least a Minecraft username or a Steam profile URL to register.', flags: MessageFlags.Ephemeral });

		// Determine which accounts were registered
		const registeredAccounts = [];
		if (mcUsername) registeredAccounts.push('Minecraft');
		if (steamId) registeredAccounts.push('Steam');
		const accountsText = registeredAccounts.length > 0 ? registeredAccounts.join(' and ') : 'their account';
		await interaction.channel.send({ content: `<@${userId}> has registered ${accountsText}!` });
		return interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
	},
};

export default registerUser;
