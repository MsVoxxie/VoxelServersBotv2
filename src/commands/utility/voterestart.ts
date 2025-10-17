import {
	Client,
	PermissionFlagsBits,
	SlashCommandBuilder,
	ApplicationIntegrationType,
	InteractionContextType,
	ChatInputCommandInteraction,
	Message,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	MessageFlags,
} from 'discord.js';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import redis from '../../loaders/database/redisLoader';
import { getKeys } from '../../utils/redisHelpers';
import Fuse from 'fuse.js';
import { instanceLogin } from '../../utils/ampAPI/coreFuncs';
import { ModuleTypeMap } from '../../types/ampTypes/ampTypes';

export const voteRestart = {
	data: new SlashCommandBuilder()
		.setName('voterestart')
		.setDescription('Start a vote to restart a server')
		.addStringOption((opt) => opt.setName('server').setDescription('Server name or keyword').setRequired(true))
		.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
		.setContexts([InteractionContextType.Guild])
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	state: 'enabled',
	devOnly: false,
	async execute(client: Client, interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();
		const input = (interaction.options.get('server')?.value as string)?.toLowerCase().trim();

		// 1. Fetch all servers from Redis
		const servers = await getKeys(redis, 'instance:*');
		const serverList = (servers as SanitizedInstance[])
			.filter((srv: SanitizedInstance) => srv.WelcomeMessage !== 'hidden')
			.map((srv: SanitizedInstance) => ({
				...srv,
				FriendlyNameLower: srv.FriendlyName?.toLowerCase() ?? '',
				InstanceNameLower: srv.InstanceName?.toLowerCase() ?? '',
			}));

		// Flexible substring and word-based matching
		let bestMatch: SanitizedInstance | null = null;
		for (const srv of serverList) {
			if (input.includes(srv.FriendlyNameLower) || input.includes(srv.InstanceNameLower)) {
				bestMatch = srv;
				break;
			}
			const inputWords = input.split(/\s+/).filter((w) => w.length >= 3);
			for (const word of inputWords) {
				if (srv.FriendlyNameLower.includes(word) || srv.InstanceNameLower.includes(word)) {
					bestMatch = srv;
					break;
				}
			}
			if (bestMatch) break;
		}
		// Fallback to Fuse.js
		if (!bestMatch) {
			const fuse = new Fuse(serverList, {
				keys: ['FriendlyName', 'InstanceName', 'FriendlyNameLower', 'InstanceNameLower'],
				threshold: 0.2,
				includeScore: true,
				minMatchCharLength: 1,
				ignoreLocation: true,
				findAllMatches: true,
			});
			const result = fuse.search(input);
			if (result.length) bestMatch = result[0].item as SanitizedInstance;
		}

		if (!bestMatch) return interaction.editReply('No matching server found.');
		const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId('confirm_yes').setLabel('✅ Yes').setStyle(ButtonStyle.Success),
			new ButtonBuilder().setCustomId('confirm_no').setLabel('❌ No').setStyle(ButtonStyle.Danger)
		);
		const confirmEmbed = {
			embeds: [
				new EmbedBuilder()
					.setTitle('Confirm Server')
					.setDescription(`Does this look like the right server? **${bestMatch.FriendlyName}**`)
					.setColor('Blue')
					.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`)
					.setThumbnail(bestMatch.ServerIcon),
			],
			components: [confirmRow],
			withResponse: true,
		};
		await interaction.editReply(confirmEmbed);

		const replyMsg = (await interaction.fetchReply()) as Message;
		const confirmCollector = replyMsg.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 15000,
		});

		let confirmed = false;
		confirmCollector.on('collect', async (i) => {
			if (i.customId === 'confirm_yes') {
				confirmed = true;
				await i.reply({
					embeds: [new EmbedBuilder().setDescription('Server confirmed!').setColor('Green')],
					flags: MessageFlags.Ephemeral,
				});
				confirmCollector.stop('confirmed');
			} else if (i.customId === 'confirm_no') {
				await i.reply({
					embeds: [new EmbedBuilder().setDescription('Vote restart cancelled.').setColor('Red')],
					flags: MessageFlags.Ephemeral,
				});
				confirmCollector.stop('cancelled');
			}
		});

		await new Promise((resolve) => confirmCollector.on('end', resolve));
		await replyMsg.edit({ components: [] });
		if (!confirmed) {
			await interaction.followUp({
				embeds: [new EmbedBuilder().setDescription('Vote restart cancelled.').setColor('Red')],
			});
			return;
		}

		// 4. Get online players (stub, replace with your function)
		const onlinePlayers = bestMatch.Metrics['Active Users'].RawValue;
		const requiredVotes = Math.ceil((onlinePlayers || 2) / 1.5) || 2;

		// 5. Start vote
		const voteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId('vote_yes').setLabel('✅ Vote Yes').setStyle(ButtonStyle.Success),
			new ButtonBuilder().setCustomId('vote_no').setLabel('❌ Vote No').setStyle(ButtonStyle.Danger)
		);

		const voteEmbed = {
			embeds: [
				new EmbedBuilder()
					.setTitle('Vote to Restart')
					.setDescription(`Vote to restart **${bestMatch.FriendlyName}** started!\nClick ✅ to vote. (${requiredVotes} votes needed)`)
					.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`)
					.setThumbnail(bestMatch.ServerIcon),
			],
			components: [voteRow],
			withResponse: true,
		};

		const voteMsg = (await interaction.followUp(voteEmbed)) as Message;

		const yesVotes = new Set<string>();
		const noVotes = new Set<string>();
		const collector = voteMsg.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 5 * 60 * 1000, // 5 minutes
		});

		collector.on('collect', async (i) => {
			if (i.customId === 'vote_yes') {
				noVotes.delete(i.user.id);
				yesVotes.add(i.user.id);
				await i.reply({
					embeds: [new EmbedBuilder().setDescription(`Vote registered! (✅ ${yesVotes.size} / ❌ ${noVotes.size})`).setColor('Green')],
					flags: MessageFlags.Ephemeral,
				});
			} else if (i.customId === 'vote_no') {
				yesVotes.delete(i.user.id);
				noVotes.add(i.user.id);
				await i.reply({
					embeds: [new EmbedBuilder().setDescription(`Vote registered! (✅ ${yesVotes.size} / ❌ ${noVotes.size})`).setColor('Red')],
					flags: MessageFlags.Ephemeral,
				});
			}
			// Optionally update the vote message with current counts
			await voteMsg.edit({
				embeds: [
					new EmbedBuilder()
						.setTitle('Vote to Restart')
						.setDescription(
							`Vote to restart **${bestMatch.FriendlyName}** started!\nClick ✅ or ❌ to vote.\n\n✅ Yes: ${yesVotes.size}\n❌ No: ${noVotes.size}\n(${requiredVotes} online, 50%+ yes required)`
						)
						.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`)
						.setThumbnail(bestMatch.ServerIcon),
				],
				components: voteMsg.components,
			});
		});

		collector.on('end', async (_collected, reason) => {
			// Remove buttons
			await voteMsg.edit({ components: [] });

			const totalVotes = yesVotes.size + noVotes.size;
			const pass = totalVotes > 0 && yesVotes.size / totalVotes >= 0.5;

			if (pass) {
				await interaction.followUp({
					embeds: [
						new EmbedBuilder()
							.setDescription(`Threshold met! Restarting **${bestMatch.FriendlyName}**...`)
							.setColor('Green')
							.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`),
					],
				});
				// Restart logic here
				const instanceAPI = await instanceLogin(bestMatch.InstanceID, bestMatch.Module as keyof ModuleTypeMap);
				const res = await instanceAPI.Core.Restart();
				interaction.followUp({
					embeds: [
						new EmbedBuilder()
							.setDescription(`**${bestMatch.FriendlyName}** ${res.Status ? 'has been told to restart.' : 'failed to restart.'}`)
							.setColor(res.Status ? 'Green' : 'Red')
							.setThumbnail(bestMatch.ServerIcon)
							.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`),
					],
				});
			} else if (reason === 'cancelled') {
				await interaction.followUp({
					embeds: [new EmbedBuilder().setDescription('Vote cancelled.').setColor('Red')],
				});
			} else {
				await interaction.followUp({
					embeds: [new EmbedBuilder().setDescription('Not enough votes or not enough yes votes. Restart cancelled.').setColor('Red')],
				});
			}
		});
	},
};

export default voteRestart;
