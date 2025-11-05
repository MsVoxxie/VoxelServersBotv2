import {
	SlashCommandBuilder,
	PermissionFlagsBits,
	ApplicationIntegrationType,
	InteractionContextType,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	MessageFlags,
	ChatInputCommandInteraction,
	Client,
	LabelBuilder,
	ChannelSelectMenuBuilder,
	ChannelType,
} from 'discord.js';
import logger from '../../utils/logger';

export default {
	data: new SlashCommandBuilder()
		.setName('serverlisting')
		.setDescription('Server listing utilities')
		.addSubcommand((sub) => sub.setName('create').setDescription('Create a new server listing'))
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
		.setContexts([InteractionContextType.Guild])
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
	state: 'enabled',
	devOnly: true,
	autoCompleteInstanceType: 'running',
	async execute(client: Client, interaction: ChatInputCommandInteraction) {
		try {
			const sub = interaction.options.getSubcommand();

			if (sub === 'create') {
				const modal = new ModalBuilder().setCustomId('server_create_modal').setTitle('Create Server Listing');
				const channelSelect = new LabelBuilder()
					.setLabel('Post Channel')
					.setDescription('Select the channel where the server listing will be posted')
					.setChannelSelectMenuComponent(
						new ChannelSelectMenuBuilder()
							.setCustomId('post_channel')
							.setChannelTypes([ChannelType.PublicThread, ChannelType.GuildText, ChannelType.GuildForum])
							.setPlaceholder('Channel to post the listing in')
							.setRequired(true)
							.setMinValues(1)
							.setMaxValues(1)
					);
				// const nameInput = new TextInputBuilder().setCustomId('server_name').setStyle(TextInputStyle.Short).setRequired(true);
				const modpackInputOrName = new TextInputBuilder().setCustomId('modpack_url_or_name').setStyle(TextInputStyle.Short).setRequired(false);
				const ipInput = new TextInputBuilder().setCustomId('server_ip').setStyle(TextInputStyle.Short).setRequired(true);
				const versionOverrideInput = new TextInputBuilder().setCustomId('version_override').setStyle(TextInputStyle.Short).setRequired(false);
				const notesInput = new TextInputBuilder().setCustomId('notes').setStyle(TextInputStyle.Paragraph).setRequired(false);
				const ipLabel = new LabelBuilder()
					.setLabel('Connection Info (IP/Domain)')
					.setDescription('The IP address or domain name of the server')
					.setTextInputComponent(ipInput);
				const modpackOrNameLabel = new LabelBuilder()
					.setLabel('The Modpack URL or Server Name')
					.setDescription('The URL to the CurseForge modpack or the name of the server')
					.setTextInputComponent(modpackInputOrName);
				const versionLabel = new LabelBuilder().setLabel('Version (optional)').setDescription('The version of the server').setTextInputComponent(versionOverrideInput);
				const notesLabel = new LabelBuilder().setLabel('Notes (optional)').setDescription('Any extra notes or instructions').setTextInputComponent(notesInput);
				modal.addLabelComponents(channelSelect, modpackOrNameLabel, ipLabel, versionLabel, notesLabel);

				await interaction.showModal(modal);
			}
		} catch (error) {
			logger.error('ServerListing', `Error: ${error}`);
			interaction.reply({ content: 'An error occurred.', flags: MessageFlags.Ephemeral });
		}
	},
};
