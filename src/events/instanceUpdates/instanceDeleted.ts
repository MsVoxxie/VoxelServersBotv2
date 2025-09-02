import { ExtendedInstance } from './../../types/ampTypes/ampTypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { Client } from 'discord.js';

const instanceDeleted: EventData = {
	name: 'instanceDeleted',
	runType: 'always',
	async execute(client: Client, instance: ExtendedInstance) {
		console.log(`Instance deleted: ${instance.FriendlyName}`);
	},
};

export default instanceDeleted;
