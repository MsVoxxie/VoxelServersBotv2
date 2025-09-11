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
	ApplicationIntegrationType,
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
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
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
				try {
					await UserData.findOneAndUpdate(
						{ discordId: interaction.user.id },
						{ discordId: interaction.user.id, minecraftUuid: id, chatlinkOptOut: chatlinkOptOut },
						{ upsert: true, new: true }
					);

					logger.info('User Registered', ` ${interaction.member.displayName} (${interaction.user.id}) with Minecraft UUID: ${id}`);

					try {
						await i.update({
							content: `Registration successful!\nUUID **${formatMCUUID(id)}** has been linked!\nOpted out of chat link?: **${chatlinkOptOut ? 'Yes' : 'No'}**`,
							embeds: [],
							components: [],
						});
					} catch (err: any) {
						if (err?.code !== 10008) logger.error('register:update', err instanceof Error ? err.message : String(err));
					}

					try {
						await interaction.channel?.send({
							content: `<@${interaction.user.id}> has registered their Minecraft username **${name}**!\nThey have also **${
								chatlinkOptOut ? 'opted out of' : 'not opted out of'
							}** chat link.`,
						});
					} catch (err: any) {
						if (err?.code !== 10008) logger.error('register:announce', err instanceof Error ? err.message : String(err));
					}
				} catch (error: any) {
					logger.error('User Registration Failed', error instanceof Error ? error.message : String(error));
					try {
						await i.update({ content: 'There was an error during registration. Please try again later.', embeds: [], components: [] });
					} catch (err: any) {
						if (err?.code !== 10008) logger.error('register:update-on-error', err instanceof Error ? err.message : String(err));
					}
				}
			} else if (i.customId === 'register_cancel') {
				try {
					await i.update({ content: 'Registration cancelled. Please run the command again with the correct username.', embeds: [], components: [] });
				} catch (err: any) {
					if (err?.code !== 10008) logger.error('register:cancel', err instanceof Error ? err.message : String(err));
				}
			}
		});

		collector.on('end', async (collected: Collection<string, ButtonInteraction>) => {
			if (collected.size === 0) {
				if (!confirmEmbed) return;
				try {
					const fetched = await interaction.channel?.messages.fetch(confirmEmbed.id).catch(() => null);
					if (!fetched) return;
					await fetched.edit({ content: 'Registration timed out. Please run the command again.', embeds: [], components: [] });
				} catch (err: any) {}
			}
		});
	},
};

export default registerUser;
