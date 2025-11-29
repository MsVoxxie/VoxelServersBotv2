import { ApplicationIntegrationType, Client, EmbedBuilder, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, inlineCode } from 'discord.js';
import { CommandData } from '../../types/discordTypes/commandTypes';
import { formatMCUUID } from '../../utils/utils';
import { UserData } from '../../models/userData';
import logger from '../../utils/logger';

const playerInfo: CommandData = {
	data: new SlashCommandBuilder()
		.setName('player')
		.setDescription('Lookup player data')
		.addSubcommand((sc) =>
			sc
				.setName('info')
				.setDescription('Get information about a player')
				.addUserOption((opt) => opt.setName('player').setDescription('The player to look up.').setRequired(true))
		)
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
		.setContexts([InteractionContextType.Guild, InteractionContextType.PrivateChannel])
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	state: 'enabled',
	devOnly: false,
	async execute(client: Client, interaction) {
		try {
			await interaction.deferReply();
			const subcommand = interaction.options.getSubcommand();

			switch (subcommand) {
				case 'info':
					const user = interaction.options.getUser('player');
					const member = user ? await interaction.guild?.members.fetch(user.id) : null;

					if (!member) return interaction.editReply({ content: 'User not found.', flags: MessageFlags.Ephemeral });
					const userData = await UserData.findOne({ userId: user?.id });
					if (!userData) return interaction.editReply({ content: 'No data found for this user.', flags: MessageFlags.Ephemeral });

					const embed = new EmbedBuilder()
						.setTitle(`Player Info: ${member?.displayName}`)
						.setThumbnail(user.displayAvatarURL())
						.setColor(client.color)
						.addFields(
							{ name: 'Discord ID', value: inlineCode(user.id), inline: false },
							{
								name: 'Minecraft',
								value: userData.minecraft?.username
									? `Username: ${userData.minecraft.username}\nUUID: ${inlineCode(userData.minecraft.uuid ? formatMCUUID(userData.minecraft.uuid) : 'N/A')}`
									: 'N/A',
								inline: false,
							},
							{
								name: 'Steam',
								value: userData.steam?.steamId ? `Steam64: ${inlineCode(userData.steam.steamId)}` : 'N/A',
								inline: false,
							},
							{
								name: 'Chatlink Status',
								value: inlineCode(userData.chatlinkOptOut ? 'Opted Out' : 'Opted In'),
								inline: false,
							}
						);

					await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
					break;

				default:
					await interaction.editReply({ content: 'Unknown subcommand.', flags: MessageFlags.Ephemeral });
					break;
			}
		} catch (error) {
			logger.error('Playerinfo', `Error executing player info command: ${error}`);
			interaction.editReply({ content: 'An error occurred while executing the command.', flags: MessageFlags.Ephemeral });
		}
	},
};

export default playerInfo;
