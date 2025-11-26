import type { ScheduleTaskData } from '../../types/discordTypes/commandTypes';
import { NetworkTestResult } from '../../types/apiTypes/networkTypes';
import { getJson, setJson, TTL } from '../../utils/redisHelpers';
import { RedisKeys } from '../../types/redisKeys/keys';
import redis from '../../loaders/database/redisLoader';
import logger from '../../utils/logger';
import ping from 'ping';

const hostToPing: string = '1.1.1.1'; // Cloudflare DNS
const pingFailValue: number = 9999; // Value to use when ping fails
const pingMaxHistory: number = 60;
const pingHistory: number[] = [];

const INTERVAL_MS = 5_000; // 5 seconds
const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // Network must be offline for 5 minutes before emitting event
const ONLINE_THRESHOLD_MS = 1 * 60 * 1000; // Network must be online for 1 minute before emitting event

const networkCheck: ScheduleTaskData = {
	name: 'Network Check',
	run({ client }) {
		const checkNetwork = async () => {
			try {
				// Fetch previous result (if any)
				const oldResult = await getJson<NetworkTestResult>(redis, RedisKeys.networkCheck());

				// Ping host and measure latency
				const { alive: isAlive, time: latencyMs } = await ping.promise.probe(hostToPing, { timeout: 2, extra: ['-c', '1'] });

				// Format latency and update history
				const latencyNum = isAlive && latencyMs !== 'unknown' ? Number(latencyMs.toFixed(1)) : pingFailValue;
				pingHistory.push(latencyNum);
				if (pingHistory.length > pingMaxHistory) pingHistory.shift();
				const latencyAvgMs = Number((pingHistory.reduce((a, b) => a + b, 0) / pingHistory.length).toFixed(1));

				// Create the result object
				let result: NetworkTestResult = {
					isAlive,
					lastOffline: isAlive ? oldResult?.lastOffline : Date.now(),
					lastOnline: isAlive ? Date.now() : oldResult?.lastOnline,
					latencyMs: isAlive ? latencyNum : pingFailValue,
					latencyAvgMs: latencyAvgMs,
					historyLength: pingHistory.length,
				};

				// If the server just came back online, only emit if lastOffline was > OFFLINE_THRESHOLD_MS
				if (isAlive && oldResult && !oldResult.isAlive) {
					const now = Date.now();
					const lastOffline = oldResult.lastOffline ?? 0;
					const difference = now - lastOffline;

					if (difference > OFFLINE_THRESHOLD_MS) {
						client.emit('networkOnline', result);
						logger.info('networkCheck', `Network connectivity restored to ${hostToPing}.`);
					}
				}

				// If the server just went offline, only emit if lastOnline was > ONLINE_THRESHOLD_MS
				if (!isAlive && oldResult && oldResult.isAlive) {
					const now = Date.now();
					const lastOnline = oldResult.lastOnline ?? 0;
					const difference = now - lastOnline;

					if (difference > ONLINE_THRESHOLD_MS) {
						client.emit('networkOffline', result);
						logger.warn('networkCheck', `Network connectivity lost to ${hostToPing}.`);
					}
				}

				// Save the result to Redis
				await setJson<NetworkTestResult>(redis, 'server:networkCheck', result, '$', TTL(1, 'Days'));
			} catch (error) {
				logger.error('networkCheck', error instanceof Error ? error.message : String(error));
			}
		};
		checkNetwork();
		setInterval(checkNetwork, INTERVAL_MS);
	},
};

export default networkCheck;
