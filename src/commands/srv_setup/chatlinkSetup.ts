import { PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { CommandData } from '../../types/commandTypes';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';
import { ExtendedInstance, ModuleTypeMap } from '../../types/ampTypes';
import { instanceLogin } from '../../utils/ampAPI/main';

const chatlinkSetup: CommandData = {
	data: new SlashCommandBuilder()
		.setName('chatlink_setup')
		.setDescription('Replies with instance information.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addStringOption((opt) => opt.setName('instance').setDescription('The instance to get information about.').setRequired(true).setAutocomplete(true)),
	state: 'enabled',
	devOnly: false,
	autoCompleteInstanceType: 'running_and_not_hidden',
	async execute(client, interaction) {
		const instanceId = interaction.options.getString('instance');
		const instanceData = await getJson(redis, `instance:${instanceId}`);
		if (!instanceData) return interaction.reply({ content: 'Instance not found or invalid data.', flags: MessageFlags.Ephemeral });
		const instance = Array.isArray(instanceData) ? (instanceData[0] as ExtendedInstance) : (instanceData as ExtendedInstance);
		const moduleName = (instance.ModuleDisplayName || instance.Module) as keyof ModuleTypeMap;
		const instanceAPI = await instanceLogin(instance.InstanceID, moduleName);
		if (!instanceAPI) return interaction.reply({ content: 'Failed to login to instance API.', flags: MessageFlags.Ephemeral });
	},
};

export default chatlinkSetup;
