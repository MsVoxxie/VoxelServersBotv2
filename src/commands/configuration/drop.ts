import { PermissionFlagsBits, SlashCommandBuilder, MessageFlags, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { CommandData } from '../../types/discordTypes/commandTypes';
import { delKeys, getKeys } from '../../utils/redisHelpers';
import redis from '../../loaders/database/redisLoader';
import logger from '../../utils/logger';

const dropCache: CommandData = {
	data: new SlashCommandBuilder()
		.setName('drop')
		.setDescription('Drop a specific cache for a given instance.')
		.addStringOption((opt) => opt.setName('instance').setDescription('The instance to get information about.').setRequired(true).setAutocomplete(true))
		.addStringOption((opt) => opt.setName('cache').setDescription('The cache to drop.').addChoices({ name: 'Player Data', value: 'playerData' }).setRequired(true))
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
		.setContexts([InteractionContextType.Guild])
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
	state: 'enabled',
	devOnly: true,
	autoCompleteInstanceType: 'running',
	async execute(client, interaction) {
		try {
			await interaction.deferReply();
			const instanceId = interaction.options.getString('instance');
			console.log(instanceId);

			const cacheType = interaction.options.getString('cache');

			switch (cacheType) {
				case 'playerData':
					const cacheData = await getKeys(redis, `playerdata:${instanceId}:*`);
					console.log(cacheData);

					if (!cacheData) {
						await interaction.editReply({ content: `No player data cache found for instance ID \`${instanceId}\`.`, flags: MessageFlags.Ephemeral });
						return;
					}

					await delKeys(redis, `playerdata:${instanceId}:*`);
					await interaction.editReply({ content: `Successfully dropped player data cache for instance ID \`${instanceId}\`.`, flags: MessageFlags.Ephemeral });
					break;

				default:
					await interaction.editReply({ content: 'Invalid cache type specified.', flags: MessageFlags.Ephemeral });
					break;
			}
		} catch (error) {
			logger.error('dropCache', `Error occurred during cache drop: ${error}`);
			interaction.editReply({ content: 'An error occurred while dropping the cache. Please try again later.', flags: MessageFlags.Ephemeral });
		}
	},
};

export default dropCache;
