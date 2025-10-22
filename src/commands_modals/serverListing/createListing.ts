import { CurseforgeModpackInfo } from './../../types/curseforge/apiTypes';
import { codeBlock, TextChannel, ThreadAutoArchiveDuration } from 'discord.js';
import { ModalHandler } from '../../types/discordTypes/commandTypes';
import { fetchModpackInformation } from '../../utils/curseforge/apiFuncs';

const createListingModal: ModalHandler = {
	customId: 'server_create_modal',
	async execute(client, interaction) {
		try {
			await interaction.deferReply();

			const serverName = interaction.fields.getTextInputValue('server_name');
			const serverIp = interaction.fields.getTextInputValue('server_ip');
			const modpackUrl = interaction.fields.getTextInputValue('modpack_url');
			const notes = interaction.fields.getTextInputValue('notes');

			// Fetch modpack info
			let modpackInfo: CurseforgeModpackInfo;
			try {
				modpackInfo = await fetchModpackInformation(modpackUrl, 'Minecraft');
			} catch (err) {
				await interaction.editReply({ content: 'Failed to fetch modpack info. Please check the URL.' });
				return;
			}

			// Create a thread in the current channel
			const channel = interaction.channel;
			if (!channel || !channel.isTextBased()) {
				await interaction.editReply({ content: 'Could not create thread: Not a text channel.' });
				return;
			}

			const thread = await (channel as TextChannel).threads.create({
				name: `[Minecraft] ${serverName}`,
				autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
				reason: 'Server listing created via modal',
			});

			// Turn latest file into version
			const latestVersion = modpackInfo.mainFile.displayName.split(' - ')[1];

			// Build the message as an array for clean Discord markdown
			const msgArr: string[] = [];
			msgArr.push(`# [${serverName} (${latestVersion})](${modpackUrl})`);
			if (modpackInfo.summary) {
				msgArr.push('');
				msgArr.push(`> ${modpackInfo.summary}`);
			}
			if (serverIp) {
				msgArr.push(`## Connection Info`);
				msgArr.push(codeBlock(serverIp));
			}
			if (notes) {
				msgArr.push(`## Notes`);
				msgArr.push(notes);
			}

			const postedMessage = await thread.send({ content: msgArr.join('\n') });

			await interaction.editReply({ content: `Thread created: <#${thread.id}>\nMessage: ${postedMessage.url}` });
			return;
		} catch (error) {
			console.error(error);
			await interaction.editReply({ content: 'An error occurred while creating the server listing.' });
			return;
		}
	},
};

export default createListingModal;
