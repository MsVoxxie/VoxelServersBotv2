import { GenericModule, Minecraft } from '@neuralnexus/ampapi';
import { MinecraftAvailableTasks, MinecraftAvailableTriggers, GenericModuleAvailableTasks, GenericModuleAvailableTriggers } from './ampScheduleOptions';

export type InstanceSearchFilter = 'all' | 'running' | 'running_and_not_hidden' | 'not_hidden' | 'not_offline';

export type ModuleTypeMap = {
	GenericModule: GenericModule;
	Minecraft: Minecraft;
};

export const AppStateMap: Record<number, string> = {
	0: 'Stopped',
	5: 'PreStart',
	7: 'Configuring',
	10: 'Starting',
	20: 'Running',
	30: 'Restarting',
	40: 'Stopping',
	45: 'PreparingForSleep',
	50: 'Sleeping',
	60: 'Waiting',
	70: 'Installing',
	75: 'Updating',
	80: 'AwaitingUserInput',
	100: 'Failed',
	200: 'Suspended',
	250: 'Maintainence',
	999: 'Indeterminate',
};

export const AppState = {
	Stopped: 'Stopped',
	PreStart: 'PreStart',
	Configuring: 'Configuring',
	Starting: 'Starting',
	Running: 'Running',
	Restarting: 'Restarting',
	Stopping: 'Stopping',
	PreparingForSleep: 'PreparingForSleep',
	Sleeping: 'Sleeping',
	Waiting: 'Waiting',
	Installing: 'Installing',
	Updating: 'Updating',
	AwaitingUserInput: 'AwaitingUserInput',
	Failed: 'Failed',
	Suspended: 'Suspended',
	Maintainence: 'Maintainence',
	Indeterminate: 'Indeterminate',
	Offline: 'Offline',
	Unknown: 'Unknown',
} as const;

export type AppStateKey = keyof typeof AppState;
export type AppStateValue = (typeof AppState)[AppStateKey];

export const AppStateEmoji: Record<string, string> = {
	Stopped: '🔴',
	PreStart: '🟠',
	Configuring: '🟣',
	Starting: '🟢',
	Running: '🟢',
	Restarting: '🟡',
	Stopping: '🟠',
	PreparingForSleep: '🔵',
	Sleeping: '🔵',
	Waiting: '🟡',
	Installing: '🔵',
	Updating: '🟣',
	AwaitingUserInput: '🟤',
	Failed: '🔴',
	Suspended: '🟠',
	Maintainence: '🟡',
	Indeterminate: '⚪',
	Offline: '⚫',
	Unknown: '❓',
};

export type AppState = keyof typeof AppStateMap;

export interface TaskToAdd<M extends keyof ModuleTypeMap> {
	taskMethod: M extends 'Minecraft' ? MinecraftAvailableTasks : GenericModuleAvailableTasks;
	dictionary: Record<string, any>;
}

export interface SchedulerJobs<M extends keyof ModuleTypeMap> {
	module: M;
	triggerDescription: M extends 'Minecraft' ? MinecraftAvailableTriggers : GenericModuleAvailableTriggers;
	tasksToAdd: TaskToAdd<M>[];
}

export interface IntervalTriggerOptions {
	months: number[];
	days: number[];
	hours: number[];
	minutes: number[];
	daysOfMonth: number[];
	description: string;
}

export type configType = Record<string, string>;
