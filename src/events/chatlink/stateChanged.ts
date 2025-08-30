import { StateChangeEvent } from './../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { Client } from 'discord.js';

const ready: EventData = {
	name: 'stateChanged',
	runType: 'always',
	async execute(client: Client, event: StateChangeEvent) {},
};

export default ready;
