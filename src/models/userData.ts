import { Schema, model } from 'mongoose';

const userDataSchema = new Schema({
	guildId: {
		type: String,
		required: true,
	},
	userId: {
		type: String,
		required: true,
		unique: true,
	},
	minecraft: {
		username: {
			type: String,
			required: false,
		},
		uuid: {
			type: String,
			required: false,
		},
	},
	steam: {
		steamId: {
			type: String,
			required: false,
		},
		profileUrl: {
			type: String,
			required: false,
		},
	},
	chatlinkOptOut: {
		type: Boolean,
		required: true,
		default: false,
	},
});

export const UserData = model('UserData', userDataSchema);
