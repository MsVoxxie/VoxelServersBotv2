import { PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder, MessageFlags, ApplicationIntegrationType, InteractionContextType, inlineCode } from 'discord.js';
import { CommandData } from '../../types/discordTypes/commandTypes';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';
import { ExtendedInstance } from '../../types/ampTypes/ampTypes';
import logger from '../../utils/logger';
import { getPort } from '../../utils/utils';

const instanceInfo: CommandData = {
	data: new SlashCommandBuilder()
		.setName('instanceinfo')
		.setDescription('Replies with instance information.')
		.addStringOption((opt) => opt.setName('instance').setDescription('The instance to get information about.').setRequired(true).setAutocomplete(true))
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
		.setContexts([InteractionContextType.Guild, InteractionContextType.PrivateChannel])
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	state: 'enabled',
	devOnly: false,
	autoCompleteInstanceType: 'running_and_not_hidden',
	async execute(client, interaction) {
		try {
			await interaction.deferReply();
			const instanceId = interaction.options.getString('instance');
			const instanceData = await getJson(redis, `instance:${instanceId}`);
			if (!instanceData) return interaction.editReply({ content: 'Instance not found or invalid data.', flags: MessageFlags.Ephemeral });
			const instance = instanceData as ExtendedInstance;

			// Build embed
			const { calculatedRawMB, calculatedMaxMB } = {
				calculatedRawMB: (instance.Metrics['Memory Usage'].RawValue / 1024).toLocaleString('en-US', { maximumFractionDigits: 2 }),
				calculatedMaxMB: (instance.Metrics['Memory Usage'].MaxValue / 1024).toLocaleString('en-US', { maximumFractionDigits: 2 }),
			};
			const description = [
				`**State:** ${instance.AppState}`,
				`**Modpack:** ${instance.ServerModpack ? `[${instance.ServerModpack.Name}](${instance.ServerModpack.URL})` : 'N/A'}`,
				`**IP / Port:** ${inlineCode(`${process.env.SERVER_IP}:${getPort(instance)}`)}`,
				'',
				`**Server Metrics:**`,
				`CPU Usage: ${instance.Metrics['CPU Usage'].Percent}%`,
				`Memory Usage: ${calculatedRawMB} / ${calculatedMaxMB} GB`,
				`Player Count: ${instance.Metrics['Active Users'].RawValue.toLocaleString()} / ${instance.Metrics['Active Users'].MaxValue.toLocaleString()}`,
				'',
				`**Player List:**`,
				`${instance.Metrics['Active Users'].PlayerList?.length ? instance.Metrics['Active Users'].PlayerList.map((p) => `${p.Username}`).join(', ') : '• No active players'}`,
			].join('\n');

			const embed = new EmbedBuilder()
				.setTitle(`**${instance.FriendlyName} Server Info**`)
				.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`)
				.setThumbnail(instance.ServerIcon)
				.setColor(client.color)
				.setDescription(description)
				.setFooter({ text: `ID: ${instance.InstanceID}` })
				.setTimestamp();
			return interaction.editReply({ embeds: [embed] });
		} catch (error) {
			logger.error('InstanceInfo', `Error fetching instance info: ${error}`);
			interaction.editReply({ content: 'An error occurred while fetching instance information.', flags: MessageFlags.Ephemeral });
		}
	},
};

export default instanceInfo;
