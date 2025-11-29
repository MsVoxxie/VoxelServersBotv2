import { Schema, model } from 'mongoose';

const serverRolesSchema = new Schema({
	guildId: {
		type: String,
		required: true,
	},
	instanceId: {
		type: String,
		required: true,
	},
	roleId: {
		type: String,
		required: true,
	},
});

export const ServerRoles = model('ServerRoles', serverRolesSchema);
