import { Instance, GenericModule, Minecraft } from '@neuralnexus/ampapi';
import { MinecraftAvailableTasks, MinecraftAvailableTriggers, GenericModuleAvailableTasks, GenericModuleAvailableTriggers } from './ampScheduleOptions';

export type InstanceSearchFilter = 'all' | 'running' | 'running_and_not_hidden' | 'not_hidden';

// Instances is missing its WelcomeMessage string property
export interface ExtendedInstance extends Omit<Instance, 'AppState' | 'Metrics'> {
	WelcomeMessage: string | '';
	AppState: string;
	ServerIcon: string;
	Metrics: { [key: string]: Metric };
}

export type PlayerList = {
	UserID: string;
	Username: string;
	AvatarURL?: string;
};

export interface Metric {
	RawValue: number;
	MaxValue: number;
	Percent: number;
	Units: string;
	Color: string | null;
	Color2: string | null;
	Color3: string | null;
	ShortName: string | null;
	PlayerList?: PlayerList[];
}

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
