export interface CommandData {
	data: {
		name: string;
		[key: string]: any;
	};
	state: 'enabled' | 'disabled';
	devOnly: boolean;
	autoCompleteInstanceType?: 'all' | 'running' | 'running_and_not_hidden' | 'not_hidden';
	execute: (...args: any[]) => Promise<void> | void;
}

import { ButtonInteraction, Client, InteractionResponse, ModalSubmitInteraction } from 'discord.js';
export interface EventData {
	name: string;
	runType: 'always' | 'once' | 'disabled';
	execute: (...args: any[]) => void | Promise<void | InteractionResponse>;
}

export interface ButtonHandler {
	customId: string;
	execute: (client: Client, interaction: ButtonInteraction) => Promise<void | InteractionResponse>;
}

export interface ModalHandler {
	customId: string;
	execute: (client: Client, interaction: ModalSubmitInteraction) => Promise<void | InteractionResponse>;
}

export interface ScheduleTaskData {
	name: string;
	run: (deps?: any) => Promise<void> | void;
}
