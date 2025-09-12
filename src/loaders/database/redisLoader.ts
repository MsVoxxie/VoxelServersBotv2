import { createClient, RedisClientType } from 'redis';
import logger from '../../utils/logger';

const RECONNECT_DELAY_MS = 5_000;
const redisHost = process.env.REDIS_IP;
const redisPort = process.env.REDIS_PORT;

const redis: RedisClientType = createClient({
	url: `redis://${redisHost}:${redisPort}`,
	socket: {
		reconnectStrategy: (retries: number) => {
			logger.info('Redis', `Attempt #${retries + 1}, retrying in ${RECONNECT_DELAY_MS}ms`);
			return RECONNECT_DELAY_MS;
		},
	},
});

redis.on('error', (err) => {
	logger.error('Redis', `Redis error: ${err instanceof Error ? err.message : String(err)}`);
});

redis.on('connect', () => {
	logger.success('Redis', 'Redis client is connecting/connected.');
});

redis.on('reconnecting', () => {
	logger.info('Redis', 'Reconnecting to Redis...');
});

redis.on('end', () => {
	logger.info('Redis', 'Connection to Redis closed.');
});

export async function connectRedis() {
	if (!redis.isOpen) {
		try {
			await redis.connect();
			logger.success('Redis', `Successfully connected to Redis.`);
		} catch (err) {
			logger.error('Redis Error', `Failed to connect to Redis. Error: ${err instanceof Error ? err.message : String(err)} — retrying in ${RECONNECT_DELAY_MS}ms`);
			setTimeout(() => {
				void connectRedis();
			}, RECONNECT_DELAY_MS);
		}
	}
	return redis;
}

export default redis;
