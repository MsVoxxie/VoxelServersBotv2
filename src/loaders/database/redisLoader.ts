import { createClient, RedisClientType } from 'redis';
import logger from '../../utils/logger';

const redisHost = process.env.REDIS_IP;
const redisPort = process.env.REDIS_PORT;

const redis = createClient({
	url: `redis://${redisHost}:${redisPort}`,
});

redis.on('error', (err) => {
	logger.error('Redis Error', `Redis connection error: ${err instanceof Error ? err.message : String(err)}`);
});

export async function connectRedis() {
	if (!redis.isOpen) {
		try {
			await redis.connect();
			logger.success('Redis Connection', `Successfully connected to Redis.`);
		} catch (err) {
			logger.error('Redis Connection Error', `Failed to connect to Redis. Error:\n${err instanceof Error ? err.message : String(err)}`);
		}
	}
	return redis as RedisClientType | null;
}
