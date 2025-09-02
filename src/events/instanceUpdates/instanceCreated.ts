import { ExtendedInstance } from './../../types/ampTypes/ampTypes';
import { EventData } from '../../types/discordTypes/commandTypes';
import { Client, EmbedBuilder } from 'discord.js';

const instanceCreated: EventData = {
	name: 'instanceCreated',
	runType: 'always',
	async execute(client: Client, instance: ExtendedInstance) {
		if (instance.WelcomeMessage === 'hidden') return;
		const [guildID, updatesChannelId] = [process.env.GUILD_ID, process.env.UPDATES_CH];
		if (!guildID || !updatesChannelId) return;
		const guild = await client.guilds.fetch(guildID);
		const channel = await guild.channels.fetch(updatesChannelId);
		if (!channel || !channel.isTextBased()) return;

		const descriptionData = [
			`**Name**: ${instance.FriendlyName}`,
			`${instance.ModuleDisplayName ? `**Desc**: ${instance.ModuleDisplayName}` : ''}`,
			`**Module**: ${instance.ModuleDisplayName || instance.Module}`,
		];

		const embed = new EmbedBuilder()
			.setTitle('Instance Created')
			.setDescription(
				descriptionData
					.map((line) => line.trim())
					.filter((line) => line)
					.join('\n')
			)
			.setFooter({ text: `${instance.InstanceID}` })
			.setThumbnail(instance.ServerIcon)
			.setColor(client.color)
			.setTimestamp();

		channel.send({ embeds: [embed] });
	},
};

export default instanceCreated;
