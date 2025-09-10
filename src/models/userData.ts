import { Schema, model } from 'mongoose';

const userDataSchema = new Schema({
	discordId: {
		type: String,
		required: true,
		unique: true,
	},
	minecraftUuid: {
		type: String,
		required: false,
		unique: true,
	},
});

const UserData = model('UserData', userDataSchema);

export default UserData;
