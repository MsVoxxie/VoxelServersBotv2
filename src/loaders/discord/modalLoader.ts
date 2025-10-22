import Table from 'cli-table3';
const modalTable = new Table({
	head: ['Category', 'Modal', 'Load Status'],
	style: { head: ['orange'] },
});

import { ModalHandler } from '../../types/discordTypes/commandTypes';
import getAllFiles from '../../utils/fileFuncs';
import type { Client } from 'discord.js';
import { join } from 'path';

export default (client: Client) => {
	const modalFolders = getAllFiles(join(__dirname, '../../commands_modals'), true);

	for (const modalFolder of modalFolders) {
		const modalFolderName = modalFolder.replace(/\\/g, '/').split('/').pop();
		const modalFiles = getAllFiles(modalFolder);
		modalFiles.sort((a: string, b: string) => (a > b ? 1 : a < b ? -1 : 0));

		for (const modalFile of modalFiles) {
			try {
				const mod = require(modalFile);
				const loadedModal = mod.default || (mod as ModalHandler);

				// Check for required properties
				if (loadedModal.customId && loadedModal.execute && typeof loadedModal.execute === 'function') {
					client.modals.set(loadedModal.customId, loadedModal);
					modalTable.push([modalFolderName, loadedModal.customId, '✔ » Loaded']);
				} else {
					const modalName = loadedModal?.customId || 'Unknown';
					modalTable.push([modalFolderName, modalName, '✕ » Errored']);
				}
			} catch (error) {
				const fileName = modalFile.split(/[/\\]/).pop()?.replace('.js', '') || 'Unknown';
				modalTable.push([modalFolderName, fileName, '✕ » Failed']);
				console.error(`Error loading modal ${fileName}:`, error);
			}
		}
	}

	console.log(modalTable.toString());
};
