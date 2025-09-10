import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Client,
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder,
	Collection,
	ButtonInteraction,
	PermissionFlagsBits,
} from 'discord.js';
import { CommandData } from '../../types/discordTypes/commandTypes';
import { formatMCUUID } from '../../utils/utils';
import UserData from '../../models/userData';
import logger from '../../utils/logger';

const registerUser: CommandData = {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDescription('Link your Minecraft account to your Discord account.')
		.addStringOption((option) => option.setName('username').setDescription('Your Minecraft username').setRequired(true))
		.addBooleanOption((option) => option.setName('chatlink').setDescription('Would you like to opt OUT of chat link? (TRUE/FALSE)').setRequired(false))
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	state: 'enabled',
	devOnly: false,
	async execute(client: Client, interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const username = interaction.options.getString('username');
		const chatlinkOptOut = interaction.options.getBoolean('chatlink') ?? false;
		const uuidReq = new Request(`https://api.minecraftservices.com/minecraft/profile/lookup/name/${username}`, { headers: { 'Content-Type': 'application/json' } });
		const usernameUUID = await fetch(uuidReq);
		const { id, name } = await usernameUUID.json();
		if (!id) return interaction.editReply({ content: 'Invalid Minecraft username provided.', flags: MessageFlags.Ephemeral });
		const playerHead = `${process.env.API_URI}/data/mchead/${name}`;

		// Create an embed to ask if the head returned is correct
		const buttonRow = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId('register_confirm').setLabel("Yes, That's me!").setStyle(ButtonStyle.Success),
			new ButtonBuilder().setCustomId('register_cancel').setLabel('No, not quite...').setStyle(ButtonStyle.Danger)
		);

		const embed = new EmbedBuilder()
			.setDescription(`## Does this look like you? →\n**Username:** ${name}\n-# **UUID:** ${formatMCUUID(id)}\n-# **Chat Link Opt-Out:** ${chatlinkOptOut ? 'Yes' : 'No'}`)
			.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`)
			.setThumbnail(playerHead)
			.setColor(client.color)
			.setFooter({ text: 'Please confirm to complete registration.' });
		const confirmEmbed = await interaction.editReply({ embeds: [embed], components: [buttonRow], flags: MessageFlags.Ephemeral });

		// Set up a collector to handle button interactions
		const filter = (i: any) => i.user.id === interaction.user.id;
		const collector = confirmEmbed.createMessageComponentCollector({ filter, time: 60000 });
		collector.on('collect', async (i: ButtonInteraction) => {
			if (i.customId === 'register_confirm') {
				await UserData.findOneAndUpdate({ discordId: interaction.user.id }, { discordId: interaction.user.id, minecraftUuid: id, chatlinkOptOut }, { upsert: true, new: true })
					.then(() => {
						logger.info('User Registered', ` ${interaction.member.displayName} (${interaction.user.id}) with Minecraft UUID: ${id}`);
						i.update({
							content: `Registration successful!\nUUID **${formatMCUUID(id)}** has been linked!\nOpted out of chat link?: ${chatlinkOptOut ? 'Yes' : 'No'}`,
							embeds: [],
							components: [],
						});
						interaction.channel.send({ content: `<@${interaction.user.id}> has registered with the Minecraft username **${name}**!` });
					})
					.catch((error) => {
						logger.error('User Registration Failed', error instanceof Error ? error.message : String(error));
						return i.update({ content: 'There was an error during registration. Please try again later.', embeds: [], components: [] });
					});
			} else if (i.customId === 'register_cancel') {
				i.update({ content: 'Registration cancelled. Please run the command again with the correct username.', embeds: [], components: [] });
			}
		});

		collector.on('end', (collected: Collection<string, ButtonInteraction>) => {
			if (collected.size === 0) {
				if (!confirmEmbed) return;
				confirmEmbed.edit({ content: 'Registration timed out. Please run the command again.', embeds: [], components: [] });
			}
		});
	},
};

export default registerUser;
