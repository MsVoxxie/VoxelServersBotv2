import { REST, Routes, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import Logger from '../../utils/logger';
import dotenv from 'dotenv';
dotenv.config();

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

// Clear commands
(async () => {
	try {
		Logger.info('Command Clear', 'Started clearing application (/) commands.');
		await rest.put(Routes.applicationCommands(process.env.BOT_ID!), { body: commands });
		Logger.success('Command Clear', 'Successfully cleared application (/) commands.');
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		Logger.error('Command Clear', `Failed to clear commands: ${errorMsg}`);
	}
})();
