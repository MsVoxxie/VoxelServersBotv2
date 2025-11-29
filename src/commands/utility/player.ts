import { ApplicationIntegrationType, Client, EmbedBuilder, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, codeBlock } from 'discord.js';
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
					const userData = await UserData.findOne({ discordId: user?.id });
					if (!userData) return interaction.editReply({ content: 'No data found for this user.', flags: MessageFlags.Ephemeral });

					const embed = new EmbedBuilder()
						.setTitle(`Player Info: ${member?.displayName}`)
						.setThumbnail(user.displayAvatarURL())
						.addFields(
							{ name: 'Discord ID', value: codeBlock(user.id), inline: false },
							{
								name: 'Minecraft UUID',
								value: codeBlock(userData.minecraftUuid ? formatMCUUID(userData.minecraftUuid) : 'N/A'),
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
