import { Client, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { CommandData } from '../../types/commandTypes';

const instanceInfo: CommandData = {
	data: new SlashCommandBuilder()
		.setName('instanceinfo')
		.setDescription('Replies with instance information.')
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
		.addStringOption((opt) => opt.setName('instance').setDescription('The instance to get information about.').setRequired(true).setAutocomplete(true)),
	state: 'enabled',
	devOnly: false,
	autoCompleteInstanceType: 'running_and_not_hidden',
	async execute(client: Client, interaction: ChatInputCommandInteraction) {
		const instanceName = interaction.options.getString('instance');
		console.log(`Instance requested: ${instanceName}`);
	},
};

export default instanceInfo;
