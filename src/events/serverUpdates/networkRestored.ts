import { NetworkTestResult } from './../../types/apiTypes/networkTypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { Client } from 'discord.js';
import logger from '../../utils/logger';

const networkRestored: EventData = {
	name: 'networkRestored',
	runType: 'always',
	async execute(client: Client, network: NetworkTestResult) {
		try {
			logger.info('Network Restored', `Network connectivity restored. Details: ${JSON.stringify(network)}`);
		} catch (error) {
			logger.error('Network Restored', `Error processing network restored event: ${error}`);
		}
	},
};

export default networkRestored;
