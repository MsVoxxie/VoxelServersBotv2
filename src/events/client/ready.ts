const { Events } = require('discord.js');
import Logger from '../../utils/logger';
import { getAllInstances } from '../../utils/ampAPI/main';

module.exports = {
	name: Events.ClientReady,
	runType: 'single',
	async execute(client: { user: { tag: any } }) {
		Logger.success('Ready Event', `Logged in as ${client.user.tag}!`);
		const instances = await getAllInstances();
		Logger.info('Available Instances', instances.map((instance) => instance.FriendlyName).join(', '));
	},
};
