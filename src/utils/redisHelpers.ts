import { RedisClientType } from 'redis';

export async function setJson<T>(client: RedisClientType, key: string, value: T, path = '.', ttlSeconds?: number) {
	await client.sendCommand(['JSON.SET', key, path, JSON.stringify(value)]);
	if (typeof ttlSeconds === 'number' && isFinite(ttlSeconds) && ttlSeconds > 0) {
		// set expire on the key (seconds)
		await client.sendCommand(['EXPIRE', key, String(Math.floor(ttlSeconds))]);
	}
}

export async function mergeJson<T extends object>(client: RedisClientType, key: string, partial: Partial<T>, path = '.', ttlSeconds?: number) {
	const existing = await getJson<T>(client, key, path);
	const merged = existing ? { ...existing, ...partial } : { ...partial };
	await setJson(client, key, merged, path, ttlSeconds);
}

export async function getJson<T>(client: RedisClientType, key: string, path = '.'): Promise<T | null> {
	const result = await client.sendCommand(['JSON.GET', key, path]);
	if (!result) return null;
	const parsed = JSON.parse(result as unknown as string);
	// RedisJSON sometimes returns the root as a single-element array when using '$' path.
	if (Array.isArray(parsed) && parsed.length === 1) return parsed[0] as T;
	return parsed as T;
}

export async function getKeys<T>(client: RedisClientType, pattern: string, path = '.'): Promise<T[]> {
	const keys = await client.keys(pattern);
	const results: T[] = [];
	for (const key of keys) {
		const obj = await getJson<T>(client, key, path);
		if (obj) results.push(obj);
	}
	return results;
}

export async function delJson(client: RedisClientType, key: string, path = '.') {
	await client.sendCommand(['JSON.DEL', key, path]);
}

type TTLUnit = 'Days' | 'Hours' | 'Minutes' | 'Seconds';

const TTL_SECONDS: Record<TTLUnit, number> = {
	Days: 86400,
	Hours: 3600,
	Minutes: 60,
	Seconds: 1,
};

export function TTL(value: number, duration: TTLUnit): number {
	if (!isFinite(value) || value <= 0) return 0;
	return Math.floor(value * TTL_SECONDS[duration]);
}
