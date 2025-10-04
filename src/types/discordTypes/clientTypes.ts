import { Collection } from 'discord.js';
import { RedisClientType } from 'redis';

declare module 'discord.js' {
	interface Client {
		backupTimers: Collection<string, NodeJS.Timeout>;
		typingState: Collection<string, any>;
		cooldowns: Collection<string, Collection<string, number>>;
		commands: Collection<string, any>;
		events: Collection<string, any>;
		redis?: RedisClientType | null;
		color: ColorResolvable;
		pingIP: string;
	}
}
