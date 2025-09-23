import { SchedulerJobs, ModuleTypeMap } from '../../types/ampTypes/ampTypes';

const sharedPostDetails = {
	URI: `${process.env.API_URI}/server/chatlink`,
	Headers: '{}',
	AuthorizationHeader: `Bearer UNNECESSARY`,
	ContentType: 'application/json',
};

const minecraftChatLink: SchedulerJobs<'Minecraft'>[] = [
	{
		module: 'Minecraft',
		triggerDescription: 'A player joins the server for the first time',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						UserId: '{@UserID}',
						Message: 'has joined for the first time!',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
			{
				taskMethod: 'SendConsole',
				dictionary: {
					Input: 'playsound minecraft:block.bell.resonate player @a 0 0 0 1 2 0.25',
				},
			},
			{
				taskMethod: 'SendConsole',
				dictionary: {
					Input: 'tellraw @a ["",{"text":"Welcome ","color":"gold"},{"text":"to the server","color":"aqua"},", ",{"text":"{@User}","color":"green"},"!"]',
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'A player joins the server',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						UserId: '{@UserID}',
						Message: 'has connected.',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
			{
				taskMethod: 'SendConsole',
				dictionary: {
					Input: 'playsound minecraft:block.conduit.activate player @a 0 0 0 1 2 0.25',
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'A player leaves the server',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						UserId: '{@UserID}',
						Message: 'has disconnected.',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
			{
				taskMethod: 'SendConsole',
				dictionary: {
					Input: 'playsound minecraft:block.conduit.deactivate player @a 0 0 0 1 2 0.25',
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'A player sends a chat message',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						UserId: '{@UserID}',
						Message: '{@Message}',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'A player is killed by an NPC',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@Victim}',
						Message: 'was {@Method} by **{@Attacker}**',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'A player is killed by another player',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@Victim}',
						Message: 'was {@Method} by **{@Attacker}**',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'A player achieves an advancement',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						Message: 'has achieved the advancement **{@Advancement}**!',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'The application state changes',
		tasksToAdd: [
			{
				taskMethod: 'IfCondition',
				dictionary: {
					ValueToCheck: '{@State}',
					Operation: '3',
					ValueToCompare: 'Pre',
				},
			},
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: '{@State}',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
						StartTime: '{@StartTime}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'The server enters sleep mode',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'is now asleep, zzz...',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: "A player tries to join the server while it's sleeping",
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'a player has attempted to connect, waking up...',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'A backup has started.',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'A backup has started.',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'A backup finishes archiving.',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'A backup has successfully archived.',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'A backup finishes restoring.',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'A backup has finished restoring.',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'A backup has failed.',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'A backup has failed.',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'The Minecraft Server stops unexpectedly',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: "It seems that I've crashed!",
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'Minecraft',
		triggerDescription: 'The Minecraft server is unable to keep up',
		tasksToAdd: [
			{
				taskMethod: 'IfCondition',
				dictionary: {
					ValueToCheck: '{@TicksSkipped}',
					Operation: '4',
					ValueToCompare: '500',
				},
			},
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: "We're lagging a bit—{@MillisecondsBehind}ms behind, {@TicksSkipped} ticks skipped!",
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
			{
				taskMethod: 'SendConsole',
				dictionary: {
					Input:
						'tellraw @a ["",{"text":"[!] ","color":"red"},{"text":"We\'re lagging a bit—"},{"text":"{@MillisecondsBehind}","color":"gold"},{"text":"ms behind, "},{"text":"{@TicksSkipped}","color":"gold"},{"text":"ticks skipped!","insertion":"ticks skipped!"}]',
				},
			},
		],
	},
];

const genericChatLink: SchedulerJobs<'GenericModule'>[] = [
	{
		module: 'GenericModule',
		triggerDescription: 'A user joins the server',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						UserId: '{@UserID}',
						Message: 'has connected.',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'GenericModule',
		triggerDescription: 'A user leaves the server',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						UserId: '{@UserID}',
						Message: 'has left the server.',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'GenericModule',
		triggerDescription: 'A user sends a chat message',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: '{@User}',
						UserId: '{@UserID}',
						Message: '{@Message}',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'GenericModule',
		triggerDescription: 'A backup finishes archiving.',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'Backup successfully archived.',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'GenericModule',
		triggerDescription: 'A backup finishes restoring.',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'A backup has successfully restored.',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'GenericModule',
		triggerDescription: 'A backup has failed.',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'Backup has failed.',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'GenericModule',
		triggerDescription: 'A backup has started.',
		tasksToAdd: [
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: 'A backup has started.',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
					}),
				},
			},
		],
	},
	{
		module: 'GenericModule',
		triggerDescription: 'The application state changes',
		tasksToAdd: [
			{
				taskMethod: 'IfCondition',
				dictionary: {
					ValueToCheck: '{@State}',
					Operation: '3',
					ValueToCompare: 'Pre',
				},
			},
			{
				taskMethod: 'MakePOSTRequest',
				dictionary: {
					...sharedPostDetails,
					Payload: JSON.stringify({
						Username: 'SERVER',
						Message: '{@State}',
						InstanceId: '{@InstanceId}',
						EventId: '{@TriggerName}',
						StartTime: '{@StartTime}',
					}),
				},
			},
		],
	},
];

// A keyed collection so callers can pick by module name
export const chatlinkJobs: { [K in keyof ModuleTypeMap]: SchedulerJobs<K>[] } = {
	Minecraft: minecraftChatLink,
	GenericModule: genericChatLink,
};
