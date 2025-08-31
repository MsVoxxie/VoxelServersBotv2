import { RedisClientType } from 'redis';

export async function setJson<T>(client: RedisClientType, key: string, value: T, path = '.', ttlSeconds?: number) {
	await client.sendCommand(['JSON.SET', key, path, JSON.stringify(value)]);
	if (typeof ttlSeconds === 'number' && isFinite(ttlSeconds) && ttlSeconds > 0) {
		// set expire on the key (seconds)
		await client.sendCommand(['EXPIRE', key, String(Math.floor(ttlSeconds))]);
	}
}

export async function getJson<T>(client: RedisClientType, key: string, path = '.'): Promise<T | null> {
	const result = await client.sendCommand(['JSON.GET', key, path]);
	if (!result) return null;
	const parsed = JSON.parse(result as unknown as string);
	// RedisJSON sometimes returns the root as a single-element array when using '$' path.
	if (Array.isArray(parsed) && parsed.length === 1) return parsed[0] as T;
	return parsed as T;
}

export async function delJson(client: RedisClientType, key: string, path = '.') {
	await client.sendCommand(['JSON.DEL', key, path]);
}
