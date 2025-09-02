import { ExtendedInstance } from './../../types/ampTypes/ampTypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { Client } from 'discord.js';

const instanceCreated: EventData = {
	name: 'instanceCreated',
	runType: 'always',
	async execute(client: Client, instance: ExtendedInstance) {
		console.log(`Instance created: ${instance.FriendlyName}`);
	},
};

export default instanceCreated;
