import { BaseInteraction, Client, Events, MessageFlags } from 'discord.js';
import type { EventData } from '../../types/discordTypes/commandTypes';
import logger from '../../utils/logger';

const handleInteraction: EventData = {
	name: Events.InteractionCreate,
	runType: 'always',
	async execute(client: Client, interaction: BaseInteraction) {
		if (!interaction.isCommand()) return;
		const command = client.commands.get(interaction.commandName);
		if (!command) return logger.warn('Unknown Command', `Command ${interaction.commandName} not found.`);

		// Check for command features
		if (command.devOnly && interaction.user.id !== process.env.DEV_ID)
			return interaction.reply({ content: 'This command is only available to the developer.', flags: MessageFlags.Ephemeral });

		if (command.state === 'disabled') return interaction.reply({ content: 'This command is currently disabled.', flags: MessageFlags.Ephemeral });

		try {
			await command.execute(client, interaction);
		} catch (error) {
			logger.error('Command Execution Error', `Error executing command ${interaction.commandName}:\n${error}`);
			await interaction.editReply({ content: 'There was an error while executing this command!' });
		}
	},
};

export default handleInteraction;
