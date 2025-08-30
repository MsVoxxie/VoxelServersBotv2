import { readdirSync } from 'fs';
import { REST, Routes, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import Logger from '../../utils/logger';
import dotenv from 'dotenv';
import { join } from 'path';

// Configuration
dotenv.config();

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];

// Grab all the command files from the commands directory
const commandsPath = join(__dirname, '../commands');
readdirSync(commandsPath).forEach((dir: string) => {
	const cmds = readdirSync(join(commandsPath, dir)).filter((file: string) => file.endsWith('.js'));
	for (const file of cmds) {
		const command = require(join(commandsPath, dir, file));
		const cmdExport = command.default || command;
		if (cmdExport && cmdExport.data && typeof cmdExport.data.toJSON === 'function') {
			commands.push(cmdExport.data.toJSON());
		} else {
			Logger.warn('Command Deploy', `Command file ${file} is missing a valid 'data' export or 'toJSON' method.`);
		}
	}
});

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

// Deploy commands
(async () => {
	try {
		Logger.info('Command Deploy', `Started refreshing ${commands.length} application (/) commands.`);
		const data = (await rest.put(Routes.applicationCommands(process.env.BOT_ID!), { body: commands })) as RESTPostAPIApplicationCommandsJSONBody[];
		Logger.success('Command Deploy', `Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		Logger.error('Command Deploy', `Failed to deploy commands: ${errorMsg}`);
	}
})();
