import { BaseInteraction, Client, Events } from 'discord.js';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import type { EventData } from '../../types/discordTypes/commandTypes';
import { AppStateEmoji } from '../../types/ampTypes/ampTypes';
import { RedisKeys } from '../../types/redisKeys/keys';
import redis from '../../loaders/database/redisLoader';
import { getKeys } from '../../utils/redisHelpers';
import logger from '../../utils/logger';
import { mongoCache } from '../../vsb';

const handleInteraction: EventData = {
	name: Events.InteractionCreate,
	runType: 'always',
	async execute(client: Client, interaction: BaseInteraction) {
		try {
			if (!interaction.isAutocomplete()) return;
			const command = client.commands.get(interaction.commandName);
			if (!command) return logger.warn('Unknown Autocomplete', `Command ${interaction.commandName} not found.`);
			const getFocusedOption = interaction.options.getFocused();

			// Grab the instances from redis
			const instances = (await getKeys(redis, RedisKeys.instance('*'))) as SanitizedInstance[] | [];
			if (!instances || instances.length === 0) return interaction.respond([{ name: 'No instances found', value: '' }]).catch(() => {});

			// Sort for user friendliness
			instances.sort((a, b) => {
				// Running Minecraft first
				if (a.Running && a.Module === 'Minecraft' && (!b.Running || b.Module !== 'Minecraft')) return -1;
				if (b.Running && b.Module === 'Minecraft' && (!a.Running || a.Module !== 'Minecraft')) return 1;

				// Other running instances next
				if (a.Running && !b.Running) return -1;
				if (!a.Running && b.Running) return 1;

				return a.FriendlyName.localeCompare(b.FriendlyName);
			});
			const filteredInstances = instances.filter((i: SanitizedInstance) => i.InstanceName.toLowerCase().includes(getFocusedOption.toLowerCase()));

			function formattedName(instance: SanitizedInstance): string {
				const emoji = AppStateEmoji[instance.AppState] || '⚪';
				const isLinked = (mongoCache.get('linkedInstanceIDs') as Set<string> | undefined)?.has(instance.InstanceID) ?? false;
				return `${emoji} ${instance.AppState} ⟩ ${instance.FriendlyName} (${instance.Module})${isLinked ? ' 🔗' : ''}`;
			}

			switch (command.autoCompleteInstanceType) {
				case 'all':
					await interaction.respond(filteredInstances.map((i: SanitizedInstance) => ({ name: formattedName(i), value: i.InstanceID })).slice(0, 25)).catch(() => {});
					break;
				case 'running':
					const runningInstances = filteredInstances.filter((i: SanitizedInstance) => i.Running === true);
					await interaction.respond(runningInstances.map((i: SanitizedInstance) => ({ name: formattedName(i), value: i.InstanceID })).slice(0, 25)).catch(() => {});
					break;
				case 'running_and_not_hidden':
					const runningAndNotHiddenInstances = filteredInstances.filter((i: SanitizedInstance) => i.Running === true && i.WelcomeMessage !== 'hidden');
					await interaction
						.respond(runningAndNotHiddenInstances.map((i: SanitizedInstance) => ({ name: formattedName(i), value: i.InstanceID })).slice(0, 25))
						.catch(() => {});
					break;
				case 'not_hidden':
					const notHiddenInstances = filteredInstances.filter((i: SanitizedInstance) => i.WelcomeMessage !== 'hidden');
					await interaction.respond(notHiddenInstances.map((i: SanitizedInstance) => ({ name: formattedName(i), value: i.InstanceID })).slice(0, 25)).catch(() => {});
					break;
				default:
					await interaction.respond([{ name: 'No instances found', value: '' }]);
					break;
			}
		} catch (error) {
			logger.error('Autocomplete', `Error processing autocomplete interaction: ${error}`);
		}
	},
};

export default handleInteraction;
