import { BaseInteraction, Client, Events, MessageFlags } from 'discord.js';
import type { EventData } from '../../types/discordTypes/commandTypes';
import { ExtendedInstance, AppStateEmoji } from '../../types/ampTypes/ampTypes';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';
import logger from '../../utils/logger';

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
			const cacheFetch = (await getJson(redis, 'instances:all')) ?? [];
			const instances = Array.isArray(cacheFetch) && cacheFetch.length === 1 ? cacheFetch[0] : (cacheFetch as ExtendedInstance[]);
			const filteredInstances = instances.filter((i: ExtendedInstance) => i.InstanceName.toLowerCase().includes(getFocusedOption.toLowerCase()));

			function formattedName(instance: ExtendedInstance): string {
				const emoji = AppStateEmoji[instance.AppState] || '⚪';
				return `${emoji} ${instance.AppState} ⟩ ${instance.FriendlyName} (${instance.ModuleDisplayName || instance.Module})`;
			}

			switch (command.autoCompleteInstanceType) {
				case 'all':
					await interaction.respond(filteredInstances.map((i: ExtendedInstance) => ({ name: formattedName(i), value: i.InstanceID })).slice(0, 25)).catch(() => {});
					break;
				case 'running':
					const runningInstances = filteredInstances.filter((i: ExtendedInstance) => i.Running === true);
					await interaction.respond(runningInstances.map((i: ExtendedInstance) => ({ name: formattedName(i), value: i.InstanceID })).slice(0, 25)).catch(() => {});
					break;
				case 'running_and_not_hidden':
					const runningAndNotHiddenInstances = filteredInstances.filter((i: ExtendedInstance) => i.Running === true && i.WelcomeMessage !== 'hidden');
					await interaction.respond(runningAndNotHiddenInstances.map((i: ExtendedInstance) => ({ name: formattedName(i), value: i.InstanceID })).slice(0, 25)).catch(() => {});
					break;
				case 'not_hidden':
					const notHiddenInstances = filteredInstances.filter((i: ExtendedInstance) => i.WelcomeMessage !== 'hidden');
					await interaction.respond(notHiddenInstances.map((i: ExtendedInstance) => ({ name: formattedName(i), value: i.InstanceID })).slice(0, 25)).catch(() => {});
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
