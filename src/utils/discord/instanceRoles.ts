import { ServerRoles } from '../../models/serverRoles';
import { Interaction } from 'discord.js';
import logger from '../../utils/logger';

export async function createServerRole(interaction: Interaction, instance: any) {
	try {
		const serverRoleDoc = await ServerRoles.findOneAndUpdate(
			{ guildId: interaction.guildId, instanceId: instance.InstanceID },
			{
				guildId: interaction.guildId,
				instanceId: instance.InstanceID,
			},
			{ upsert: true, new: true }
		);
		if (serverRoleDoc?.roleId) {
			// Check if role exists in guild
			const role = await interaction.guild?.roles.fetch(serverRoleDoc.roleId).catch(() => null);
			if (role) return serverRoleDoc;
		}
		// Create role if not exists
		const role = await interaction.guild?.roles.create({
			name: `${instance.FriendlyModule} - ${instance.FriendlyName}`,
			colors: { primaryColor: Math.floor(Math.random() * 0xffffff) },
			reason: `Role created for instance ${instance.FriendlyName} (${instance.InstanceID})`,
		});
		if (role) {
			serverRoleDoc.roleId = role.id;
			await serverRoleDoc.save();
			return serverRoleDoc;
		}
		return null;
	} catch (error) {
		logger.error('Instance Created', `Error creating server role: ${error}`);
		return null;
	}
}

export async function deleteServerRole(interaction: Interaction, instanceId: string) {
	try {
		const guild = interaction.guild;
		if (!guild) return false;
		const serverRoleDoc = await ServerRoles.findOne({ guildId: guild.id, instanceId });
		if (serverRoleDoc?.roleId) {
			const role = await guild.roles.fetch(serverRoleDoc.roleId).catch(() => null);
			if (!role) return true; // If role doesn't exist, just return
			await role.delete('Instance deleted, removing server role');
			await serverRoleDoc.deleteOne();
			return true;
		}
		return false;
	} catch (error) {
		logger.error('Instance Deleted', `Error deleting server role: ${error}`);
		return false;
	}
}
