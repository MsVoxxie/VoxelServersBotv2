// dotenv
import dotenv from 'dotenv';
dotenv.config();

// Logger
import Logger from './utils/logger';

// Discord Client
import './types/discordTypes/clientTypes';
import { Client, Collection, Colors, GatewayIntentBits } from 'discord.js';
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
client.color = Colors.White;
client.backupTimers = new Collection();
client.typingState = new Collection();
client.cooldowns = new Collection();
client.commands = new Collection();
client.buttons = new Collection();
client.events = new Collection();

// Load Events
import eventLoader from './loaders/discord/eventLoader';
eventLoader(client);

// Load Commands
import commandLoader from './loaders/discord/commandLoader';
commandLoader(client);

// Load Buttons
import buttonLoader from './loaders/discord/buttonLoader';
buttonLoader(client);

// Load API
import server from './loaders/api/server';
server(client);

// Login
client.login(process.env.DISCORD_TOKEN).catch((error) => {
	Logger.error('Login Error', `Failed to login: ${error.message}`);
});
