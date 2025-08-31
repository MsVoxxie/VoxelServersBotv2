import { StateChangeEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import { Client } from 'discord.js';

const userJoins: EventData = {
    name: 'userJoins',
    runType: 'always',
    async execute(client: Client, event: StateChangeEvent) {
        await toDiscord(event);
    },
};

export default userJoins;
