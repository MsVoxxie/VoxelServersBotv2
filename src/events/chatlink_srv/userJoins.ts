import { updatePlayerState } from '../../utils/gameSpecific/playerData';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import { ServerRoles } from '../../models/serverRoles';
import { userdataCache } from '../../vsb';
import logger from '../../utils/logger';
import { Client } from 'discord.js';

const userJoins: EventData = {
	name: 'userJoins',
	runType: 'always',
	async execute(client: Client, event: PlayerEvent) {
		try {
			const msgMod = await updatePlayerState(event, 'Join');
			if (msgMod.length) event.Message += msgMod;

			// Send to Discord
			await toDiscord(event);

			// Apply server role to player if applicable
			try {
				const uuid = event.UserId?.replace(/-/g, '') || '';
				const userSet = userdataCache.get('userDataSet') as Set<any>;
				const user = [...userSet].find((u) => u.minecraftUuid === uuid);
				const discordMember = await client.users.fetch(user?.discordId || '').catch(() => null);
				const guild = user.guildId ? await client.guilds.fetch(user.guildId).catch(() => null) : await client.guilds.fetch(process.env.GUILD_ID || '').catch(() => null);
				if (discordMember) {
					const serverRoles = await ServerRoles.find({ instanceId: event.InstanceId, guildId: guild?.id || '' });
					for (const serverRole of serverRoles) {
						const role = await guild?.roles.fetch(serverRole.roleId).catch(() => null);
						const member = await guild?.members.fetch(discordMember.id).catch(() => null);
						if (role && member && !member.roles.cache.has(role.id)) {
							await member.roles.add(role, `User joined instance ${event.InstanceName}`);
						}
					}
				}
			} catch (error) {
				logger.error('UserJoins', `Error assigning server role on user join: ${error}`);
			}
		} catch (error) {
			logger.error('UserJoins', `Error processing user joins event: ${error}`);
		}
	},
};

export default userJoins;
