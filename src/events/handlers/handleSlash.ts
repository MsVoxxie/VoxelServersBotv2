import { BaseInteraction, Client, Events, MessageFlags, ChatInputCommandInteraction } from 'discord.js';
import type { EventData } from '../../types/discordTypes/commandTypes';
import logger from '../../utils/logger';

const handleSlashCommand: EventData = {
	name: Events.InteractionCreate,
	runType: 'always',
	async execute(client: Client, interaction: BaseInteraction) {
		if (!interaction.isChatInputCommand()) return;
		const chat = interaction as ChatInputCommandInteraction;
		const command = client.commands.get(chat.commandName);
		if (!command) return logger.warn('Unknown Command', `Command ${interaction.commandName} not found.`);

		// Check for command features
		if (command.devOnly && chat.user.id !== process.env.DEV_ID)
			return chat.reply({ content: 'This command is only available to the developer.', flags: MessageFlags.Ephemeral });

		if (command.state === 'disabled') return chat.reply({ content: 'This command is currently disabled.', flags: MessageFlags.Ephemeral });

		try {
			await command.execute(client, chat);
		} catch (error) {
			logger.error('Command Execution Error', `Error executing command ${chat.commandName}:\n${error}`);
			if (chat.deferred || chat.replied) {
				await chat.editReply({ content: 'There was an error while executing this command!' });
			} else {
				await chat.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
			}
		}
	},
};

export default handleSlashCommand;
