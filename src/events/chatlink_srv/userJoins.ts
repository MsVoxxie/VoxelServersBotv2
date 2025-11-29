import { updatePlayerState } from '../../utils/gameSpecific/playerData';
import { PlayerEvent } from '../../types/apiTypes/chatlinkAPITypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { toDiscord } from '../../utils/discord/webhooks';
import { ServerRoles } from '../../models/serverRoles';
import { userdataCache } from '../../vsb';
import logger from '../../utils/logger';
import { Client } from 'discord.js';
import { toSteam64, wait } from '../../utils/utils';
import { sendServerConsoleCommand } from '../../utils/ampAPI/instanceFuncs';
import { getJson } from '../../utils/redisHelpers';
import redis from '../../loaders/database/redisLoader';
import { RedisKeys } from '../../types/redisKeys/keys';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { ModuleTypeMap } from '../../types/ampTypes/ampTypes';
import { Minecraft } from '@neuralnexus/ampapi';
import { part, tellRawBuilder } from '../../utils/gameSpecific/minecraftTellraw';

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
				const rawUserId = (event.UserId || '').toString();
				const normalizedUuid = rawUserId.replace(/-/g, '').toLowerCase();
				const steamUserIdCandidate = toSteam64(rawUserId);

				const userSet = (userdataCache.get('userDataSet') as Set<any>) || new Set();
				const user = [...userSet].find((u) => {
					const mcUuidStored: string = (u?.minecraft?.uuid || '').toString();
					const mcNorm = mcUuidStored.replace(/-/g, '').toLowerCase();
					const steamStored: string = (u?.steam?.steamId || '').toString();
					return (mcNorm && mcNorm === normalizedUuid) || (steamStored && steamStored === steamUserIdCandidate);
				});

				// If the user isn't linked...
				if (!user) {
					// Fetch the instance to tell the user to link
					const instance: SanitizedInstance | null = await getJson(redis, RedisKeys.instance(event.InstanceId));
					if (!instance) return;
					const module = instance.Module as keyof ModuleTypeMap;
					await wait(5_000); // Wait 5 seconds to ensure user is fully loaded in.

					switch (module) {
						case 'Minecraft':
							const tellRaw = tellRawBuilder('@p', [
								part("Looks like you haven't linked your accounts yet!", 'yellow'),
								part('Please register over in the', 'white'),
								part('VoxelServers', 'gold'),
								part('Discord servers bot-commands channel with the', 'white'),
								part('/register', 'aqua'),
								part('command!', 'white'),
							]);
							await sendServerConsoleCommand(event.InstanceId, module, tellRaw);
							break;

						case 'GenericModule':
							const message = `Hello! It looks like you haven't linked your accounts yet. Please register over in the VoxelServers Discord server's bot-commands channel with the /register command!`;
							// await sendServerConsoleCommand(event.InstanceId, module, `say ${message}`); // We'll do this one later.
							break;
					}
					return;
				}

				const discordId: string = user.userId || '';
				if (!discordId) return;

				const discordMember = await client.users.fetch(discordId).catch(() => null);
				const guild = user.guildId ? await client.guilds.fetch(user.guildId).catch(() => null) : await client.guilds.fetch(process.env.GUILD_ID || '').catch(() => null);
				if (!guild) return;
				if (discordMember) {
					const serverRoles = await ServerRoles.find({ instanceId: event.InstanceId, guildId: guild?.id || '' });
					if (!serverRoles || serverRoles.length === 0) return;
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
