import { NetworkTestResult } from '../../types/apiTypes/networkTypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { Client } from 'discord.js';
import logger from '../../utils/logger';

const networkOffline: EventData = {
	name: 'networkOffline',
	runType: 'always',
	async execute(client: Client, network: NetworkTestResult) {
		try {
			logger.info('Network Offline', `Network connectivity lost. Details: ${JSON.stringify(network)}`);
		} catch (error) {
			logger.error('Network Offline', `Error processing network offline event: ${error}`);
		}
	},
};

export default networkOffline;
