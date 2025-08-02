import { Instance } from '@neuralnexus/ampapi';

// Instances is missing its WelcomeMessage string property
export interface ExtendedInstance extends Omit<Instance, 'AppState'> {
	WelcomeMessage: string | '';
	AppState: string;
}

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
