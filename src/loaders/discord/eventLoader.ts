import Table from 'cli-table3';
const eventTable = new Table({
	head: ['Directory', 'Event', 'Load Status', 'Run Type'],
	style: { head: ['cyan'] },
});

import getAllFiles from '../../utils/fileFuncs';
import { join } from 'path';
import type { Client } from 'discord.js';
import type { EventData } from '../../types/commandTypes';

export default (client: Client) => {
	// Read the events directory
	const eventFolders = getAllFiles(join(__dirname, '../../events'), true);

	for (const eventFolder of eventFolders) {
		const eventFolderName = eventFolder.replace(/\\/g, '/').split('/').pop();
		const eventFiles = getAllFiles(eventFolder);
		eventFiles.sort((a: string, b: string) => (a > b ? 1 : a < b ? -1 : 0));

		for (const eventFile of eventFiles) {
			const mod = require(eventFile);
			const loadedEvent = mod.default || (mod as EventData);

			if (loadedEvent.name) client.events.set(loadedEvent.name, loadedEvent);

			switch (loadedEvent.runType) {
				case 'once':
					client.once(loadedEvent.name, (...args: any[]) => loadedEvent.execute(client, ...args));
					eventTable.push([eventFolderName, loadedEvent.name, '✔ » Loaded', '«  Once  »']);
					break;

				case 'always':
					client.on(loadedEvent.name, (...args: any[]) => loadedEvent.execute(client, ...args));
					eventTable.push([eventFolderName, loadedEvent.name, '✔ » Loaded', '«Infinity»']);
					break;

				case 'disabled':
					eventTable.push([eventFolderName, loadedEvent.name, '✕ » Skipped', '«Disabled»']);
					continue;

				default:
					eventTable.push([eventFolderName, loadedEvent.name, '✕ » Errored', '«Unknown»']);
					continue;
			}
		}
	}
	console.log(eventTable.toString());
};
