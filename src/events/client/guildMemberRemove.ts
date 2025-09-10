import { Events, Client, GuildMember } from 'discord.js';
import UserData from '../../models/userData';
import { EventData } from '../../types/discordTypes/commandTypes';
import logger from '../../utils/logger';

const ready: EventData = {
	name: Events.GuildMemberRemove,
	runType: 'always',
	async execute(client: Client, member: GuildMember) {
		await UserData.findOneAndDelete({ discordId: member.id }).catch(() =>
			logger.error('Guild Member Remove', `Failed to remove user data for ${member.user.tag} (${member.id})`)
		);
	},
};

export default ready;
