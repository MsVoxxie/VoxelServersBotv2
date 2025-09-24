import { PermissionFlagsBits, SlashCommandBuilder, MessageFlags, EmbedBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { CommandData } from '../../types/discordTypes/commandTypes';
import { TTL } from '../../utils/redisHelpers';
import { ExtendedInstance } from '../../types/ampTypes/ampTypes';
import { getAllInstances } from '../../utils/ampAPI/mainFuncs';
import { setInstanceConfig } from '../../utils/ampAPI/configFuncs';
import logger from '../../utils/logger';

const offsetSchedules: CommandData = {
	data: new SlashCommandBuilder()
		.setName('offset_schedules')
		.setDescription('Offsets the schedule for all active instances by a value.')
		.addNumberOption((opt) => opt.setName('value').setDescription('The value to offset the schedule by.').setRequired(true))
		.addStringOption((opt) =>
			opt
				.setName('nomination')
				.setDescription('The nomination to apply the offset with.')
				.addChoices([
					{ name: 'Days', value: 'Days' },
					{ name: 'Hours', value: 'Hours' },
					{ name: 'Minutes', value: 'Minutes' },
				])
				.setRequired(true)
		)
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
		.setContexts([InteractionContextType.Guild])
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
	state: 'enabled',
	devOnly: false,
	autoCompleteInstanceType: 'running',
	async execute(client, interaction) {
		try {
			interaction.deferReply();
			const instances = (await getAllInstances({ fetch: 'running' })) as ExtendedInstance[];
			if (!instances) return interaction.reply({ content: 'Instances not found or invalid data.', flags: MessageFlags.Ephemeral });

			const value = interaction.options.getNumber('value', true);
			const nomination = interaction.options.getString('nomination', true);
			const secondsToOffset = TTL(value, nomination as 'Days' | 'Hours' | 'Minutes');

			for (const [idx, instance] of instances.entries()) {
				const offsetForInstance = secondsToOffset * idx;
				const module = instance.ModuleDisplayName || instance.Module;
				logger.info('OffsetSchedules', `Offsetting instance ${instance.FriendlyName} by ${offsetForInstance} seconds`);
				await setInstanceConfig(instance.InstanceID, module, { key: 'Core.AMP.ScheduleOffsetSeconds', value: `${offsetForInstance}` });
			}
			interaction.editReply({ content: `Offset schedules for ${instances.length} instances by ${value} ${nomination}.` });
		} catch (error) {
			logger.error('OffsetSchedules', `Error offsetting schedules: ${error}`);
			interaction.editReply({ content: 'An error occurred while offsetting schedules.', flags: MessageFlags.Ephemeral });
		}
	},
};
export default offsetSchedules;
