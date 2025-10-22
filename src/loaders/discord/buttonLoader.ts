import Table from 'cli-table3';
const buttonTable = new Table({
	head: ['Category', 'Button', 'Load Status'],
	style: { head: ['blue'] },
});

import { ButtonHandler } from '../../types/discordTypes/commandTypes';
import getAllFiles from '../../utils/fileFuncs';
import type { Client } from 'discord.js';
import { join } from 'path';

export default (client: Client) => {
	const buttonFolders = getAllFiles(join(__dirname, '../../commands_buttons'), true);

	for (const buttonFolder of buttonFolders) {
		const buttonFolderName = buttonFolder.replace(/\\/g, '/').split('/').pop();
		const buttonFiles = getAllFiles(buttonFolder);
		buttonFiles.sort((a: string, b: string) => (a > b ? 1 : a < b ? -1 : 0));

		for (const buttonFile of buttonFiles) {
			try {
				const mod = require(buttonFile);
				const loadedButton = mod.default || (mod as ButtonHandler);

				// Check for required properties
				if (loadedButton.customId && loadedButton.execute && typeof loadedButton.execute === 'function') {
					client.buttons.set(loadedButton.customId, loadedButton);
					buttonTable.push([buttonFolderName, loadedButton.customId, '✔ » Loaded']);
				} else {
					const buttonName = loadedButton?.customId || 'Unknown';
					buttonTable.push([buttonFolderName, buttonName, '✕ » Errored']);
				}
			} catch (error) {
				const fileName = buttonFile.split(/[/\\]/).pop()?.replace('.js', '') || 'Unknown';
				buttonTable.push([buttonFolderName, fileName, '✕ » Failed']);
				console.error(`Error loading button ${fileName}:`, error);
			}
		}
	}

	console.log(buttonTable.toString());
};
