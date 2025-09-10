import { Client, CommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { CommandData } from '../../types/discordTypes/commandTypes';

const ping: CommandData = {
	data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!').setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	state: 'enabled',
	devOnly: false,
	async execute(client: Client, interaction: CommandInteraction) {
		await interaction.deferReply();
		await interaction.editReply(`<@${interaction.user.id}> Pong!`);
	},
};

export default ping;
