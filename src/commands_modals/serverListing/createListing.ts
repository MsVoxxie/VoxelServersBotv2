import { CurseforgeModpackInfo } from './../../types/curseforge/apiTypes';
import { codeBlock, TextChannel, PublicThreadChannel, ChannelType } from 'discord.js';
import { ModalHandler } from '../../types/discordTypes/commandTypes';
import { fetchModpackInformation } from '../../utils/curseforge/apiFuncs';

const createListingModal: ModalHandler = {
	customId: 'server_create_modal',
	async execute(client, interaction) {
		try {
			await interaction.deferReply();

			const selectedChannels = interaction.fields.getSelectedChannels('post_channel');
			const channel = selectedChannels?.find(
				(ch): ch is TextChannel | PublicThreadChannel => ch instanceof TextChannel || ch.type === ChannelType.PublicThread || ch.type === ChannelType.GuildForum
			);
			if (!channel) {
				await interaction.editReply({ content: 'No valid text or public thread channel selected.' });
				return;
			}
			// const serverName = interaction.fields.getTextInputValue('server_name');
			const serverIp = interaction.fields.getTextInputValue('server_ip');
			const versionOverride = interaction.fields.getTextInputValue('version_override');
			const modpackUrlOrName = interaction.fields.getTextInputValue('modpack_url_or_name');
			const notes = interaction.fields.getTextInputValue('notes');

			// Try to fetch modpack info, but if it fails, treat as plain string
			let modpackInfo: CurseforgeModpackInfo | null = null;
			try {
				modpackInfo = await fetchModpackInformation(modpackUrlOrName, 'Minecraft');
			} catch (err) {
				// Not a valid modpack, treat as plain string
			}

			// Build the message as an array for clean Discord markdown
			const msgArr: string[] = [];
			if (!modpackInfo) {
				// Fallback: just use the string as the server name
				msgArr.push(`# ${modpackUrlOrName}${versionOverride ? ` (${versionOverride})` : ''}`);
				if (serverIp) {
					msgArr.push('');
					msgArr.push(`## Connection Info`);
					msgArr.push(codeBlock(serverIp));
				}
				if (notes) {
					msgArr.push(`## Details`);
					msgArr.push(notes);
				}
			} else {
				// Use CurseForge info
				const latestVersion = versionOverride || modpackInfo.mainFile.displayName.split(' - ')[1];
				msgArr.push(`# [${modpackInfo.name} (${latestVersion})](${modpackInfo.links?.websiteUrl || modpackUrlOrName})`);
				if (modpackInfo.summary) {
					msgArr.push('');
					msgArr.push(`> ${modpackInfo.summary}`);
				}
				if (serverIp) {
					msgArr.push(`## Connection Info`);
					msgArr.push(codeBlock(serverIp));
				}
				if (notes) {
					msgArr.push('');
					msgArr.push(`## Extra Information`);
					msgArr.push(notes);
				}
			}

			// Post it
			const postedMessage = await channel.send({ content: msgArr.join('\n') });
			if (interaction.channel === channel) {
				await interaction.deleteReply();
				return;
			} else {
				await interaction.editReply({ content: `Server listing created successfully in ${channel}. [Jump to message](${postedMessage.url})` });
			}
		} catch (error) {
			console.error(error);
			await interaction.editReply({ content: 'An error occurred while creating the server listing.' });
			return;
		}
	},
};

export default createListingModal;
