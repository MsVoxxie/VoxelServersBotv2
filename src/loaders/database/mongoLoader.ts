import mongoose, { ConnectOptions } from 'mongoose';
import logger from '../../utils/logger';

const Key = process.env.MONGOOSE_TOKEN || '';
const RECONNECT_DELAY_MS = 5_000;

const dbOptions: ConnectOptions & { connectTimeoutMS?: number; autoIndex?: boolean; family?: number; serverSelectionTimeoutMS?: number } = {
	connectTimeoutMS: 10 * 1000,
	autoIndex: false,
	family: 4,
	serverSelectionTimeoutMS: 10 * 1000,
};

async function connectWithRetry(): Promise<void> {
	if (!Key) return;
	try {
		await mongoose.connect(Key, dbOptions);
	} catch (err) {
		logger.error('Mongo', `Failed to connect to MongoDB: ${err instanceof Error ? err.message : String(err)} — retrying in ${RECONNECT_DELAY_MS}ms`);
		setTimeout(() => void connectWithRetry(), RECONNECT_DELAY_MS);
	}
}

export function init(): void {
	if (!Key) {
		logger.error('Mongo', 'DATABASE_TOKEN is not set; skipping mongoose.connect');
		return;
	}

	// Use native promises
	(mongoose as any).Promise = global.Promise;

	mongoose.connection.on('connected', () => {
		logger.success('Mongo', 'Mongo DB Connected');
	});

	mongoose.connection.on('error', (err) => {
		logger.error('Mongo', `Mongo DB error: ${err instanceof Error ? err.message : String(err)}`);
	});

	mongoose.connection.on('disconnected', () => {
		logger.warn('Mongo', 'Mongo DB Disconnected — attempting reconnect');
		setTimeout(() => void connectWithRetry(), RECONNECT_DELAY_MS);
	});

	mongoose.connection.on('reconnected', () => {
		logger.success('Mongo', 'Mongo DB Reconnected');
	});

	void connectWithRetry();
}

export default { init };
