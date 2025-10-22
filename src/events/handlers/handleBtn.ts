import { BaseInteraction, Client, Events, MessageFlags } from 'discord.js';
import { EventData } from '../../types/discordTypes/commandTypes';
import logger from '../../utils/logger';

const handleButtonCommand: EventData = {
	name: Events.InteractionCreate,
	runType: 'always',
	async execute(client: Client, interaction: BaseInteraction) {
		if (!interaction.isButton()) return;

		// Find handler by exact match or prefix
		const handler = client.buttons.find((h, key) => interaction.customId.startsWith(key));
		if (!handler) return interaction.reply({ content: 'Unknown button.', flags: MessageFlags.Ephemeral });

		try {
			await handler.execute(client, interaction);
		} catch (error) {
			logger.error('Button Execution Error', `Error executing button ${interaction.customId}:\n${error}`);
			await interaction.reply({ content: 'There was an error while processing this button!', flags: MessageFlags.Ephemeral });
		}
	},
};

export default handleButtonCommand;
