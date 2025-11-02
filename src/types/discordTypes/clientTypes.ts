import { Collection } from 'discord.js';
import { RedisClientType } from 'redis';

declare module 'discord.js' {
	interface Client {
		backupTimers: Collection<string, NodeJS.Timeout>;
		cooldowns: Collection<string, Collection<string, number>>;
		mongoCache: Collection<string, any>;
		typingState: Collection<string, any>;
		commands: Collection<string, any>;
		buttons: Collection<string, any>;
		modals: Collection<string, any>;
		events: Collection<string, any>;
		redis?: RedisClientType | null;
		color: ColorResolvable;
	}
}
