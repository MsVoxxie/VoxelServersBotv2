const { Events } = require('discord.js');
import Logger from '../../functions/logger';

module.exports = {
	name: Events.ClientReady,
	runType: 'single',
	async execute(client: { user: { tag: any } }) {
		Logger.success(`Ready! Logged in as ${client.user.tag}`);
	},
};
