import { Events } from 'discord.js';
import Logger from '../../utils/logger';
import { EventData } from '../../types/commandTypes';
import { getAllInstances } from '../../utils/ampAPI/main';

const ready: EventData = {
	name: Events.ClientReady,
	runType: 'once',
	async execute(client: { user: { tag: any } }) {
		Logger.success('Ready Event', `Logged in as ${client.user.tag}!`);
		const instances = await getAllInstances({ fetch: 'all' });
		Logger.info('Available Instances', instances.map((instance) => instance.FriendlyName).join(', '));
	},
};

export default ready;
