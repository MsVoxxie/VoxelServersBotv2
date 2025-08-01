import { RedisClientType } from 'redis';

export async function setJson<T>(client: RedisClientType, key: string, value: T, path = '$') {
	await client.sendCommand(['JSON.SET', key, path, JSON.stringify(value)]);
}

export async function getJson<T>(client: RedisClientType, key: string, path = '$'): Promise<T | null> {
	const result = await client.sendCommand(['JSON.GET', key, path]);
	return result ? JSON.parse(result as unknown as string) : null;
}

export async function delJson(client: RedisClientType, key: string, path = '$') {
	await client.sendCommand(['JSON.DEL', key, path]);
}
