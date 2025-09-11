import { PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder, MessageFlags, ApplicationIntegrationType } from 'discord.js';
import { CommandData } from '../../types/discordTypes/commandTypes';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';
import { ExtendedInstance } from '../../types/ampTypes/ampTypes';

const instanceInfo: CommandData = {
	data: new SlashCommandBuilder()
		.setName('instanceinfo')
		.setDescription('Replies with instance information.')
		.addStringOption((opt) => opt.setName('instance').setDescription('The instance to get information about.').setRequired(true).setAutocomplete(true))
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	state: 'enabled',
	devOnly: false,
	autoCompleteInstanceType: 'running_and_not_hidden',
	async execute(client, interaction) {
		await interaction.deferReply();
		const instanceId = interaction.options.getString('instance');
		const instanceData = await getJson(redis, `instance:${instanceId}`);
		if (!instanceData) return interaction.editReply({ content: 'Instance not found or invalid data.', flags: MessageFlags.Ephemeral });
		const instance = instanceData as ExtendedInstance;
		const getModpack = (str: string): boolean => {
			const urlPattern = /^https?:\/\/.+/i;
			return urlPattern.test(str);
		};

		const isModpack = getModpack(instance.WelcomeMessage);
		const description = [
			`**State:** ${instance.AppState}`,
			`**${isModpack ? 'Modpack' : 'MOTD'}:** ${isModpack ? `[Modpack Link](${instance.WelcomeMessage})` : instance.WelcomeMessage || 'None'}`,
			``,
			`**Server Metrics:**`,
			`CPU Usage: ${instance.Metrics['CPU Usage'].Percent}%`,
			`Memory Usage: ${instance.Metrics['Memory Usage'].RawValue}/${instance.Metrics['Memory Usage'].MaxValue} MB`,
			`Player Count: ${instance.Metrics['Active Users'].RawValue}/${instance.Metrics['Active Users'].MaxValue}`,
			``,
			`**Player List:**`,
			`${instance.Metrics['Active Users'].PlayerList?.length ? instance.Metrics['Active Users'].PlayerList.map((p) => `${p.Username}`).join(', ') : '• No active players'}`,
		].join('\n');

		const embed = new EmbedBuilder()
			.setTitle(`**${instance.FriendlyName} Server Info**`)
			.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`)
			.setColor(client.color)
			.setDescription(description)
			.setFooter({ text: `Instance ID: ${instance.InstanceID}` });
		return interaction.editReply({ embeds: [embed] });
	},
};

export default instanceInfo;
