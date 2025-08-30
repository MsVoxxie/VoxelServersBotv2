import { Job } from './../../types/ampTypes';
import { PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { CommandData } from '../../types/commandTypes';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';
import { ExtendedInstance, ModuleTypeMap } from '../../types/ampTypes';
import { instanceLogin } from '../../utils/ampAPI/main';
import { createJobsFromList } from '../../utils/ampAPI/taskFuncs';

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

		switch (moduleName) {
			case 'Minecraft':
				await createJobsFromList(instance.InstanceID, moduleName, minecraftChatLink);
				break;

			default:
				break;
		}
	},
};

export default chatlinkSetup;

const sharedPostDetails = {
	URI: 'urlhere',
	ContentType: 'application/json',
};

const minecraftChatLink: Job<'Minecraft'>[] = [
	{
		module: 'Minecraft',
		triggerName: 'A player joins the server for the first time',
		tasksToAdd: [
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						UserID: '{@UserID}',
						Message: 'has joined for the first time!',
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
			{
				taskName: 'SendConsole',
				dictionary: {
					Input: 'playsound minecraft:block.bell.resonate player @a 0 0 0 1 2 0.25',
				},
			},
			{
				taskName: 'SendConsole',
				dictionary: {
					Input: 'tellraw @a ["",{"text":"Welcome ","color":"gold"},{"text":"to the server","color":"aqua"},", ",{"text":"{@User}","color":"green"},"!"]',
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'A player joins the server',
		tasksToAdd: [
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						UserID: '{@UserID}',
						Message: 'has connected.',
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
			{
				taskName: 'SendConsole',
				dictionary: {
					Input: 'playsound minecraft:block.conduit.activate player @a 0 0 0 1 2 0.25',
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'A player leaves the server',
		tasksToAdd: [
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						UserID: '{@UserID}',
						Message: 'has disconnected.',
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
			{
				taskName: 'SendConsole',
				dictionary: {
					Input: 'playsound minecraft:block.conduit.deactivate player @a 0 0 0 1 2 0.25',
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'A player sends a chat message',
		tasksToAdd: [
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						UserID: '{@UserID}',
						Message: '{@Message}',
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'A player is killed by an NPC',
		tasksToAdd: [
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@Victim}',
						Message: 'was {@Method} by **{@Attacker}**',
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'A player is killed by another player',
		tasksToAdd: [
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@Victim}',
						Message: 'was {@Method} by **{@Attacker}**',
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'A player achieves an advancement',
		tasksToAdd: [
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						Message: 'has achieved the advancement **{@Advancement}**!',
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'The application state changes',
		tasksToAdd: [
			{
				taskName: 'IfCondition',
				dictionary: {
					ValueToCheck: '{@State}',
					Operation: '3',
					ValueToCompare: 'Pre',
				},
			},
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: '{@State}',
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'A backup has started.',
		tasksToAdd: [
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'A backup has started.',
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'A backup finishes archiving.',
		tasksToAdd: [
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'A backup has successfully archived.',
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'A backup finishes restoring.',
		tasksToAdd: [
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'A backup has finished restoring.',
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'A backup has failed.',
		tasksToAdd: [
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'A backup has failed.',
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'The Minecraft Server stops unexpectedly',
		tasksToAdd: [
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: "It seems that I've crashed!",
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerName: 'The Minecraft server is unable to keep up',
		tasksToAdd: [
			{
				taskName: 'IfCondition',
				dictionary: {
					ValueToCheck: '{@TicksSkipped}',
					Operation: '4',
					ValueToCompare: '500',
				},
			},
			{
				taskName: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: "We're lagging a bit—{@MillisecondsBehind}ms behind, {@TicksSkipped} ticks skipped!",
						InstanceID: '{@InstanceId}',
						EventID: '{@TriggerName}',
					}),
				},
			},
		],
	},
];
