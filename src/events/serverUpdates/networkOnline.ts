import { NetworkTestResult } from '../../types/apiTypes/networkTypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { Client } from 'discord.js';
import logger from '../../utils/logger';

const networkOnline: EventData = {
	name: 'networkOnline',
	runType: 'always',
	async execute(client: Client, network: NetworkTestResult) {
		try {
			logger.info('Network Online', `Network connectivity restored. Details: ${JSON.stringify(network)}`);
		} catch (error) {
			logger.error('Network Online', `Error processing network online event: ${error}`);
		}
	},
};

export default networkOnline;
