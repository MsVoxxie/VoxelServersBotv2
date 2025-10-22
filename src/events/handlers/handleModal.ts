import { BaseInteraction, Client, Events, MessageFlags } from 'discord.js';
import { EventData } from '../../types/discordTypes/commandTypes';
import logger from '../../utils/logger';

const handleModalCommand: EventData = {
	name: Events.InteractionCreate,
	runType: 'always',
	async execute(client: Client, interaction: BaseInteraction) {
		if (!interaction.isModalSubmit()) return;

		// Find handler by exact match or prefix
		const handler = client.modals.find((h, key) => interaction.customId.startsWith(key));
		if (!handler) return interaction.reply({ content: 'Unknown modal.', flags: MessageFlags.Ephemeral });

		try {
			await handler.execute(client, interaction);
		} catch (error) {
			logger.error('Modal Execution Error', `Error executing modal ${interaction.customId}:\n${error}`);
			await interaction.reply({ content: 'There was an error while processing this modal!', flags: MessageFlags.Ephemeral });
		}
	},
};

export default handleModalCommand;
