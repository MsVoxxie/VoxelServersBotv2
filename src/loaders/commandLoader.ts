import Table from 'cli-table3';
const commandTable = new Table({
	head: ['Category', 'Command', 'Load Status'],
	style: { head: ['cyan'] },
});

import getAllFiles from '../utils/fileFuncs';
import { join } from 'path';
import type { Client } from 'discord.js';
import type { CommandData } from '../types/commandTypes';

export default (client: Client) => {
	// Read the commands directory
	const commandFolders = getAllFiles(join(__dirname, '../../dist/commands'), true);

	// Loop over the commands directory to retrieve all command files
	for (const commandFolder of commandFolders) {
		const commandFolderName = commandFolder.replace(/\\/g, '/').split('/').pop();

		// Get command files and sort them by load order
		const commandFiles = getAllFiles(commandFolder);
		commandFiles.sort((a: string, b: string) => (a > b ? 1 : a < b ? -1 : 0));

		// Loop over the command files to retrieve all commands
		for (const commandFile of commandFiles) {
			try {
				const mod = require(commandFile);
				const loadedCommand = mod.default || (mod as CommandData);

				// Check if command has required properties
				if (loadedCommand.data && loadedCommand.execute && typeof loadedCommand.execute === 'function') {
					client.commands.set(loadedCommand.data.name, loadedCommand);
					commandTable.push([commandFolderName, loadedCommand.data.name, '✔ » Loaded']);
				} else {
					const commandName = loadedCommand?.data?.name || 'Unknown';
					commandTable.push([commandFolderName, commandName, '✕ » Errored']);
				}
			} catch (error) {
				const fileName = commandFile.split(/[/\\]/).pop()?.replace('.js', '') || 'Unknown';
				commandTable.push([commandFolderName, fileName, '✕ » Failed']);
				console.error(`Error loading command ${fileName}:`, error);
			}
		}
	}

	console.log(commandTable.toString());
};
