import { ApplicationIntegrationType, Client, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { CommandData } from '../../types/discordTypes/commandTypes';
import logger from '../../utils/logger';

const ping: CommandData = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!')
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	state: 'enabled',
	devOnly: false,
	async execute(client: Client, interaction) {
		try {
			await interaction.deferReply();
			await interaction.editReply(`<@${interaction.user.id}> Pong!`);
		} catch (error) {
			logger.error('Ping', `Error executing ping command: ${error}`);
			interaction.editReply({ content: 'An error occurred while executing the command.', flags: MessageFlags.Ephemeral });
		}
	},
};

export default ping;
