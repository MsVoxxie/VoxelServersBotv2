import { Events, Client, Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EventData } from '../../types/discordTypes/commandTypes';
import { getKeys } from '../../utils/redisHelpers';
import { RedisKeys } from '../../types/redisKeys/keys';
import redis from '../../loaders/database/redisLoader';
import Fuse from 'fuse.js';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';

const HELP_CHANNEL_ID = '997537989238476991'; // Use database later
const ISSUE_KEYWORDS = [
	'caught up',
	'having issues',
	'lag',
	'down',
	'cant join',
	'can t join',
	'can not join',
	'cannot join',
	'restart',
	'crash',
	'crashed',
	'stuck',
	'disconnect',
	'disconnected',
	'freeze',
	'freezing',
	'bug',
	'broken',
	'error',
	'fail',
	'failed',
	'not working',
	'wont start',
	'wont connect',
	'wont work',
	'wont load',
	'no response',
	'timeout',
	'timed out',
	'slow',
	'unresponsive',
	'dead',
	'offline',
	'hang',
	'hanging',
	'bootloop',
	'loop',
	'kick',
	'kicked',
	'kickout',
	'kick out',
	'kickoff',
	'kick off',
	'drop',
	'dropped',
	'dropout',
	'drop out',
	'drop off',
	'dropoff',
	'downed',
	'downing',
	'outage',
	'maintenance',
	'restart',
	'reboot',
	'restarting',
	'rebooting',
	'reconnect',
	'reconnecting',
	'reconnects',
	'reconnect failed',
	'reconnect error',
];
const ISSUE_THRESHOLD = 4;
const ISSUE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// Track recent issue reports: { userId, timestamp, messageId }
const recentIssueReports: { userId: string; timestamp: number; messageId: string }[] = [];

const messageCreate: EventData = {
	name: Events.MessageCreate,
	runType: 'always',
	async execute(client: Client, message: Message) {
		if (message.channel.id !== HELP_CHANNEL_ID || message.author.bot) return;

		const lowerContent = message.content.toLowerCase();
		if (ISSUE_KEYWORDS.some((keyword) => lowerContent.includes(keyword))) {
			recentIssueReports.push({ userId: message.author.id, timestamp: Date.now(), messageId: message.id });

			// Remove reports outside the window
			const cutoff = Date.now() - ISSUE_WINDOW_MS;
			for (let i = recentIssueReports.length - 1; i >= 0; i--) {
				if (recentIssueReports[i].timestamp < cutoff) recentIssueReports.splice(i, 1);
			}

			// Count unique users in the window
			const uniqueUsers = new Set(recentIssueReports.map((r) => r.userId));
			if (uniqueUsers.size >= ISSUE_THRESHOLD) {
				// Try to detect server name from all recent issue messages
				let serverMatchText = '';
				try {
					const servers = await getKeys(redis, RedisKeys.instance('*'));
					// Normalize server names for better matching
					const serverList = (servers as SanitizedInstance[])
						.filter((srv: SanitizedInstance) => srv.WelcomeMessage !== 'hidden')
						.map((srv: SanitizedInstance) => ({
							...srv,
							FriendlyNameLower: srv.FriendlyName?.toLowerCase() ?? '',
							InstanceNameLower: srv.InstanceName?.toLowerCase() ?? '',
						}));

					const fuse = new Fuse(serverList, {
						keys: ['FriendlyName', 'InstanceName', 'FriendlyNameLower', 'InstanceNameLower'],
						threshold: 0.1,
						includeScore: true,
						minMatchCharLength: 1,
						ignoreLocation: true,
						findAllMatches: true,
					});
					// Gather all recent messages for matching
					const recentMessages = await Promise.all(
						recentIssueReports.map(async (r) => {
							try {
								const msg = await message.channel.messages.fetch(r.messageId);
								return msg.content;
							} catch {
								return '';
							}
						})
					);
					// Add current message content as fallback
					recentMessages.push(message.content);
					// Search for best match in all recent messages
					let bestMatch = null;
					for (const msgContent of recentMessages) {
						const normalizedMsg = msgContent.toLowerCase();
						// Substring-first matching
						for (const srv of serverList) {
							// Direct substring match
							if (normalizedMsg.includes(srv.FriendlyNameLower) || normalizedMsg.includes(srv.InstanceNameLower)) {
								bestMatch = srv;
								break;
							}
							// Flexible word-based partial match
							const msgWords = normalizedMsg.split(/\s+/).filter((w) => w.length >= 3);
							for (const word of msgWords) {
								if (srv.FriendlyNameLower.includes(word) || srv.InstanceNameLower.includes(word)) {
									bestMatch = srv;
									break;
								}
							}
							if (bestMatch) break;
						}
						if (bestMatch) break;
						// Fallback to Fuse.js
						const result = fuse.search(normalizedMsg);
						if (result.length) {
							bestMatch = result[0].item as SanitizedInstance;
							break;
						}
					}
					if (bestMatch) {
						serverMatchText = `Detected server: **${bestMatch.FriendlyName || bestMatch.InstanceName}**`;
					}
				} catch (err) {
					null;
				}
				const replyMsg = await message.reply({
					embeds: [
						new EmbedBuilder()
							.setTitle('Server Issue Detected')
							.setDescription(`${serverMatchText}\nMultiple users are reporting issues. Would you like to start a restart vote?`)
							.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`),
					],
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('start_vote').setLabel('Start Vote').setStyle(ButtonStyle.Success)),
					],
				});
				recentIssueReports.length = 0;

				// Listen for button interaction
				const collector = replyMsg.createMessageComponentCollector({
					filter: (i) => i.customId === 'start_vote',
					max: 1,
					time: 60 * 1000,
				});
				collector.on('collect', async (interaction) => {
					// Remove button and update embed
					await replyMsg.edit({
						components: [],
						embeds: [
							new EmbedBuilder()
								.setTitle('Vote Starting')
								.setDescription(`A vote is being started for ${serverMatchText ? serverMatchText.replace('Detected server: ', '') : 'the reported server'}!`)
								.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`),
						],
					});
					// Execute the voterestart command with detected server name
					const serverName = serverMatchText ? serverMatchText.replace(/Detected server: \*\*(.+)\*\*\\n/, '$1').trim() : '';
					if (serverName) {
						const voterestartCmd = interaction.client.commands?.get('voterestart');
						if (voterestartCmd && typeof voterestartCmd.execute === 'function') {
							// Minimal synthetic interaction
							const fakeInteraction = Object.create(interaction);
							fakeInteraction.commandName = 'voterestart';
							fakeInteraction.options = {
								get: (name: string) => (name === 'server' ? { value: serverName } : undefined),
							};
							// All other properties/methods are inherited from the original interaction
							await voterestartCmd.execute(client, fakeInteraction);
						} else {
							await interaction.followUp({ content: 'Could not start vote: voterestart command not found.', ephemeral: true });
						}
					} else {
						await interaction.followUp({ content: 'Could not detect server name for vote.', ephemeral: true });
					}
				});
			}
		}
	},
};

export default messageCreate;
