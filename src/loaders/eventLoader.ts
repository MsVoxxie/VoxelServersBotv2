import Table from 'cli-table3';
const eventTable = new Table({
	head: ['Directory', 'Event', 'Load Status', 'Run Type'],
	style: { head: ['cyan'] },
});

import getAllFiles from '../functions/fileFuncs';
import { join } from 'path';
import type { Client } from 'discord.js';

export default (client: Client) => {
	// Read the events directory
	const eventFolders = getAllFiles(join(__dirname, '../../dist/events'), true);
	// Loop over the events directory to retrieve all event files
	for (const eventFolder of eventFolders) {
		const eventFolderName = eventFolder.replace(/\\/g, '/').split('/').pop();
		// Get event files and sort them by load order
		const eventFiles = getAllFiles(eventFolder);
		eventFiles.sort((a: string, b: string) => (a > b ? 1 : a < b ? -1 : 0));
		// Loop over the event files to retrieve all events
		for (const eventFile of eventFiles) {
			const loadedEvent = require(eventFile);
			if (loadedEvent.name) client.events.set(loadedEvent.name, loadedEvent);

			// Switch statement to determine how to load the event
			switch (loadedEvent.runType) {
				case 'single':
					client.once(loadedEvent.name, (...args: any[]) => loadedEvent.execute(client, ...args));
					eventTable.push([eventFolderName, loadedEvent.name, '✔ » Loaded', '«  Once  »']);
					break;

				case 'infinity':
					client.on(loadedEvent.name, (...args: any[]) => loadedEvent.execute(client, ...args));
					eventTable.push([eventFolderName, loadedEvent.name, '✔ » Loaded', '«infinity»']);
					break;

				case 'disabled':
					eventTable.push([eventFolderName, loadedEvent.name, '✕ » Skipped', '«Disabled»']);
					continue;

				default:
					eventTable.push([eventFolderName, loadedEvent.name, '✕ » Errored', '« Unknown »']);
					continue;
			}
		}
	}
	console.log(eventTable.toString());
};
