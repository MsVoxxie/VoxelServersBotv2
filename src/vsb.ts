// dotenv
import dotenv from 'dotenv';
dotenv.config();

// Logger
import Logger from './utils/logger';

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

// Load API
import server from './loaders/server';
server(client);

// Login
client.login(process.env.DISCORD_TOKEN).catch((error) => {
	Logger.error('Login Error', `Failed to login: ${error.message}`);
});
