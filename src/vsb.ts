// dotenv
import dotenv from 'dotenv';
dotenv.config();

// Discord Client
import './types/clientTypes';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
	],
	allowedMentions: {
		parse: [],
	},
});

// Define Collections
client.backupTimers = new Collection();
client.typingState = new Collection();
client.cooldowns = new Collection();
client.commands = new Collection();
client.events = new Collection();

// Load Events
import eventLoader from './loaders/eventLoader';
eventLoader(client);

// Login
client.login(process.env.DISCORD_TOKEN).catch((error) => {
	console.error('Failed to login:', error);
});
