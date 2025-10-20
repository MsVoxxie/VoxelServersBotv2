import { PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder, MessageFlags, ApplicationIntegrationType, InteractionContextType, inlineCode } from 'discord.js';
import { toDiscordTimestamp } from '../../utils/discord/timestampGenerator';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { CommandData } from '../../types/discordTypes/commandTypes';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';
import logger from '../../utils/logger';

const serverInfo: CommandData = {
	data: new SlashCommandBuilder()
		.setName('server_info')
		.setDescription('Replies with server information.')
		.addStringOption((opt) => opt.setName('server').setDescription('The server to get information about.').setRequired(true).setAutocomplete(true))
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
		.setContexts([InteractionContextType.Guild, InteractionContextType.PrivateChannel])
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	state: 'enabled',
	devOnly: false,
	autoCompleteInstanceType: 'running_and_not_hidden',
	async execute(client, interaction) {
		try {
			await interaction.deferReply();
			const serverId = interaction.options.getString('server');
			const serverData = await getJson(redis, `instance:${serverId}`);
			if (!serverData) return interaction.editReply({ content: 'Server not found or invalid data.', flags: MessageFlags.Ephemeral });
			const instance = serverData as SanitizedInstance;

			// Build embed
			const { calculatedRawMB, calculatedMaxMB } = {
				calculatedRawMB: (instance.Metrics['Memory Usage'].RawValue / 1024).toLocaleString('en-US', { maximumFractionDigits: 2 }),
				calculatedMaxMB: (instance.Metrics['Memory Usage'].MaxValue / 1024).toLocaleString('en-US', { maximumFractionDigits: 2 }),
			};

			// Build Restart and Backup Info
			const nextRestart = `${
				instance.NextRestart
					? `${toDiscordTimestamp(new Date(instance.NextRestart.nextRunDate), 't')} (${toDiscordTimestamp(new Date(instance.NextRestart.nextRunDate), 'R')})`
					: 'N/A'
			}`;
			const nextBackup = `${
				instance.NextBackup
					? `${toDiscordTimestamp(new Date(instance.NextBackup.nextRunDate), 't')} (${toDiscordTimestamp(new Date(instance.NextBackup.nextRunDate), 'R')})`
					: 'N/A'
			}`;

			const description = [
				`**State:** ${instance.AppState}`,
				`**Modpack:** ${instance.ServerModpack ? `[${instance.ServerModpack.Name}](${instance.ServerModpack.URL})` : 'N/A'}`,
				`**IP / Port:** ${inlineCode(`${process.env.SERVER_IP}:${instance.ConnectionInfo.Port}`)}`,
				'',
				`**Server Metrics:**`,
				`CPU Usage: ${instance.Metrics['CPU Usage'].Percent}%`,
				`Memory Usage: ${calculatedRawMB} / ${calculatedMaxMB} GB`,
				`Player Count: ${instance.Metrics['Active Users'].RawValue.toLocaleString()} / ${instance.Metrics['Active Users'].MaxValue.toLocaleString()}`,
				'',
				`**Next Scheduled Tasks:**`,
				`Next Restart: ${nextRestart}`,
				`Next Backup: ${nextBackup}`,
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
			logger.error('ServerInfo', `Error fetching server info: ${error}`);
			interaction.editReply({ content: 'An error occurred while fetching server information.', flags: MessageFlags.Ephemeral });
		}
	},
};

export default serverInfo;
