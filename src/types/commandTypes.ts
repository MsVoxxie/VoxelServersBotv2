export interface CommandData {
	data: {
		name: string;
		[key: string]: any;
	};
	state: 'enabled' | 'disabled';
	devOnly: boolean;
	execute: (...args: any[]) => Promise<void> | void;
}

import { InteractionResponse } from 'discord.js';
export interface EventData {
	name: string;
	runType: 'always' | 'once' | 'disabled';
	execute: (...args: any[]) => void | Promise<void | InteractionResponse>;
}

export interface ScheduleTaskData {
	name: string;
	run: (deps?: any) => Promise<void> | void;
}
