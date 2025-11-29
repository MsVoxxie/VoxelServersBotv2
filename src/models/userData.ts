import { Schema, model } from 'mongoose';

const userDataSchema = new Schema({
	guildId: {
		type: String,
		required: true,
	},
	discordId: {
		type: String,
		required: true,
		unique: true,
	},
	minecraftUsername: {
		type: String,
		required: false,
		unique: true,
	},
	minecraftUuid: {
		type: String,
		required: false,
		unique: true,
	},
	chatlinkOptOut: {
		type: Boolean,
		required: false,
		default: false,
	},
});

export const UserData = model('UserData', userDataSchema);
