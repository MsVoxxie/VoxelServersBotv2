import mongoose, { ConnectOptions } from 'mongoose';
import logger from '../../utils/logger';

const Key = process.env.MONGOOSE_TOKEN || '';

export function init(): void {
	const dbOptions: ConnectOptions & { connectTimeoutMS?: number; autoIndex?: boolean; family?: number } = {
		connectTimeoutMS: 10 * 1000,
		autoIndex: false,
		family: 4,
	};

	if (!Key) {
		logger.error('MONGO', 'DATABASE_TOKEN is not set; skipping mongoose.connect');
		return;
	}

	// Connect to mongoose
	mongoose.connect(Key, dbOptions).catch((err) => {
		logger.error('MONGO', 'Failed to connect to MongoDB');
	});

	// Use native promises
	(mongoose as any).Promise = global.Promise;

	mongoose.connection.on('connected', () => {
		logger.success('MONGO', 'Mongo DB Connected');
	});

	mongoose.connection.on('error', (err) => {
		logger.error('MONGO', 'Mongo DB Ran into an error');
	});

	mongoose.connection.on('disconnected', () => {
		logger.warn('MONGO', 'Mongo DB Disconnected');
	});
}

export default { init };
