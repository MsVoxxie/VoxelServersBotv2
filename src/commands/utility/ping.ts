import { Client, CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { CommandData } from '../../types/commandTypes';

const ping: CommandData = {
	data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
	state: 'enabled',
	devOnly: false,
	async execute(client: Client, interaction: CommandInteraction) {
		interaction.deferReply();
		await interaction.editReply(`<@${interaction.user.id}> Pong!`);
	},
};

export default ping;
