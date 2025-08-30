import { Schema, model } from 'mongoose';

const chatlinkSchemas = new Schema({
	webhookId: {
		type: String,
		required: true,
	},
	webhookToken: {
		type: String,
		required: true,
	},
	guildId: {
		type: String,
		required: true,
	},
	channelId: {
		type: String,
		required: true,
	},
	instanceId: {
		type: String,
		required: true,
	},
});

export const chatlinkModel = model('ChatLink', chatlinkSchemas);
