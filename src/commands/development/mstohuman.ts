import { PermissionFlagsBits, SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType, MessageFlags } from 'discord.js';
import { CommandData } from '../../types/discordTypes/commandTypes';
import { msToHuman } from '../../utils/utils';
import logger from '../../utils/logger';

const convertToHuman: CommandData = {
	data: new SlashCommandBuilder()
		.setName('ms_to_human')
		.setDescription('Convert milliseconds to a human-readable format.')
		.addNumberOption((option) => option.setName('milliseconds').setDescription('The number of milliseconds to convert').setMinValue(0).setRequired(true))
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
		.setContexts([InteractionContextType.Guild, InteractionContextType.PrivateChannel])
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
	state: 'enabled',
	devOnly: false,
	autoCompleteInstanceType: 'running',
	async execute(client, interaction) {
		try {
			await interaction.deferReply();
			const ms = interaction.options.getNumber('milliseconds');
			if (ms < 0) return interaction.editReply({ content: 'Please provide a non-negative number of milliseconds.', flags: MessageFlags.Ephemeral });
			const result = msToHuman(ms);
			interaction.editReply({ content: `\`${ms}\` milliseconds is approximately \`${result.join(' ')}\`.` });
		} catch (error) {
			logger.error('msToHuman', `Error running msToHuman: ${error}`);
			interaction.editReply({ content: 'An error occurred while executing the command.', flags: MessageFlags.Ephemeral });
		}
	},
};

export default convertToHuman;
