import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder } from 'discord.js';
import { SanitizedInstance } from './../../types/ampTypes/instanceTypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { setJson, TTL } from '../../utils/redisHelpers';
import { RedisKeys } from '../../types/redisKeys/keys';
import redis from '../../loaders/database/redisLoader';
import logger from '../../utils/logger';
const instanceCreated: EventData = {
	name: 'instanceCreated',
	runType: 'always',
	async execute(client: Client, instance: SanitizedInstance) {
		try {
			if (instance.WelcomeMessage === 'hidden') return;
			const [guildID, approvalsChannelId] = [process.env.GUILD_ID, process.env.APPROVALS_CH];
			if (!guildID || !approvalsChannelId) return;
			const guild = await client.guilds.fetch(guildID);
			const channel = await guild.channels.fetch(approvalsChannelId);
			if (!channel || !channel.isTextBased()) return;

			const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId(`instcreate_accept_${instance.InstanceID}`).setLabel('Accept & Post').setStyle(ButtonStyle.Success),
				new ButtonBuilder().setCustomId(`instcreate_ignore_${instance.InstanceID}`).setLabel('Ignore').setStyle(ButtonStyle.Danger)
			);

			const descriptionData = [
				`**Name**: ${instance.FriendlyName}`,
				`${instance.Description ? `**Desc**: ${instance.Description}` : ''}`,
				`${instance.ServerModpack ? `**Modpack**: [${instance.ServerModpack.Name}](${instance.ServerModpack.URL})` : ''}`,
				`**Module**: ${instance.Module}`,
			]
				.map((line) => line.trim())
				.filter((line) => line)
				.join('\n');

			const tmpEmbed = new EmbedBuilder()
				.setTitle('Instance Created')
				.setDescription(`Awaiting Approval to Post\n${descriptionData}`)
				.setFooter({ text: `${instance.InstanceID}` })
				.setThumbnail(instance.ServerIcon)
				.setColor(client.color)
				.setTimestamp();

			const approvalMsg = await channel.send({ embeds: [tmpEmbed], components: [actionRow] });
			await setJson(redis, RedisKeys.pendingInstanceCreate(instance.InstanceID), { ...instance, approvalMsgId: approvalMsg.id }, '$', TTL(1, 'Days')); // 24h TTL
		} catch (error) {
			logger.error('Instance Created', `Error processing instance created event: ${error}`);
		}
	},
};

export default instanceCreated;
