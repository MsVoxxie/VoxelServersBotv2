import { AppStateMap, InstanceSearchFilter, IntervalTriggerResult, ModuleTypeMap } from '../../types/ampTypes/ampTypes';
import { MetricSimple, SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { ADS, IADSInstance, Instance } from '@neuralnexus/ampapi';
import { getIntervalTrigger } from './intervalFuncs';
import { getModpack, getPort, wait } from '../utils';
import { getImageSource } from './getSourceImage';
import { getInstanceConfig } from './configFuncs';
import redis from '../../loaders/database/redisLoader';
import { getJson, setJson } from '../redisHelpers';
import { mongoCache } from '../../vsb';
import logger from '../logger';
let globalAPI: ADS;

const METRICS_HISTORY_LENGTH = 20;
const trackedMetricAliases: Record<keyof MetricSimple, string[]> = {
	CPU: ['CPU Usage'],
	Memory: ['Memory Usage', 'RAM Usage'],
	TPS: ['TPS', 'Tick Rate', 'Tickrate', 'Average TPS', 'Avg TPS'],
};
const createEmptyHistory = (): MetricSimple => ({ CPU: [], Memory: [], TPS: [] });
const cloneHistory = (history: MetricSimple): MetricSimple => ({
	CPU: [...history.CPU],
	Memory: [...history.Memory],
	TPS: [...history.TPS],
});
const metricsHistoryStore = new Map<string, MetricSimple>();

// Map helper with concurrency limit
async function mapWithConcurrency<T, R>(items: T[], worker: (item: T, idx: number) => Promise<R>, concurrency: number): Promise<(R | undefined)[]> {
	const results: (R | undefined)[] = new Array(items.length);
	let idx = 0;

	const runners: Promise<void>[] = [];
	const limit = Math.max(1, Math.floor(concurrency));
	for (let i = 0; i < Math.min(limit, items.length); i++) {
		runners.push(
			(async () => {
				while (true) {
					const current = idx++;
					if (current >= items.length) return;
					try {
						results[current] = await worker(items[current], current);
					} catch (err) {
						logger.warn('getAllInstances', `Instance worker failed: ${String(err)}`);
						results[current] = undefined;
					}
				}
			})()
		);
	}

	await Promise.all(runners);
	return results;
}

export async function apiLogin(): Promise<ADS> {
	const { AMP_URI, AMP_USER, AMP_PASS } = process.env;
	if (!AMP_URI || !AMP_USER || !AMP_PASS) throw logger.error('apiLogin', 'Missing AMP environment variables');

	// Helper to (re)login and update cache
	const doLogin = async () => {
		const API = new ADS(AMP_URI, AMP_USER, AMP_PASS);
		await API.APILogin();
		globalAPI = API;
		return globalAPI;
	};

	if (globalAPI) {
		try {
			// Try a lightweight call to check session validity
			await globalAPI.ADSModule.GetInstances();
			return globalAPI;
		} catch (err: any) {
			const msg = err?.message || String(err);
			if (msg.includes('Session.Exists')) {
				globalAPI = undefined as any;
				return await doLogin();
			}
			throw logger.error('apiLogin', `Failed to use cached global API: ${msg}`);
		}
	}
	return await doLogin();
}

const instanceApiFailures = new Map<string, number>();
const instanceApiCache = new Map<string, any>();
const inflightInstanceLogins = new Map<string, Promise<any>>();
// Per-instance cooldown state
type CooldownEntry = { failures: number; backoffMs: number; cooldownUntil: number };
const instanceCooldowns = new Map<string, CooldownEntry>();

const COOLDOWN_FAILURES = Number(process.env.COOLDOWN_FAILURES) || 3;
const COOLDOWN_BASE_MS = Number(process.env.COOLDOWN_BASE_MS) || 60_000; // 1 minute
const COOLDOWN_MAX_MS = Number(process.env.COOLDOWN_MAX_MS) || 15 * 60_000; // 15 minutes

function isInstanceOnHold(instanceId: string): boolean {
	const entry = instanceCooldowns.get(instanceId);
	if (!entry) return false;
	if (Date.now() < entry.cooldownUntil) return true;
	// cooldown expired
	instanceCooldowns.delete(instanceId);
	return false;
}

function setInstanceCooldown(instanceId: string, failures: number) {
	const over = Math.max(0, failures - (COOLDOWN_FAILURES - 1));
	const backoff = Math.min(COOLDOWN_MAX_MS, COOLDOWN_BASE_MS * Math.pow(2, Math.max(0, over - 1)));
	instanceCooldowns.set(instanceId, { failures, backoffMs: backoff, cooldownUntil: Date.now() + backoff });
}

function clearInstanceHold(instanceId: string) {
	instanceCooldowns.delete(instanceId);
	// also clear recorded API failures for this instance
	for (const key of Array.from(instanceApiFailures.keys())) {
		if (key.startsWith(`${instanceId}:`)) instanceApiFailures.delete(key);
	}
}

function noteInstanceFailure(instanceId: string) {
	// compute max failures across modules for this instance
	const failures = Math.max(
		0,
		...Array.from(instanceApiFailures.entries())
			.filter(([k]) => k.startsWith(`${instanceId}:`))
			.map(([, v]) => v)
	);
	if (failures >= COOLDOWN_FAILURES) setInstanceCooldown(instanceId, failures);
}

export async function instanceLogin<K extends keyof ModuleTypeMap>(instanceID: string, instanceModule: K): Promise<ModuleTypeMap[K] | null> {
	const cacheKey = `${instanceID}:${instanceModule}`;
	let instanceAPI = instanceApiCache.get(cacheKey) as ModuleTypeMap[K] | undefined;

	// Helper to (re)login and update cache with inflight dedupe
	const performLogin = (): Promise<ModuleTypeMap[K]> => {
		const existing = inflightInstanceLogins.get(cacheKey) as Promise<ModuleTypeMap[K]> | undefined;
		if (existing) {
			return existing;
		}

		const p = (async () => {
			const API = await apiLogin();
			const newAPI = await API.InstanceLogin<ModuleTypeMap[K]>(instanceID, instanceModule);
			instanceApiCache.set(cacheKey, newAPI);
			instanceApiFailures.set(cacheKey, 0); // Reset failures on success
			return newAPI as ModuleTypeMap[K];
		})();

		inflightInstanceLogins.set(cacheKey, p);
		p.then(() => inflightInstanceLogins.delete(cacheKey)).catch(() => inflightInstanceLogins.delete(cacheKey));
		return p;
	};

	// Check if the cached API is still valid
	if (instanceAPI) {
		try {
			await instanceAPI.Core.AsyncTest();
			instanceApiFailures.set(cacheKey, 0); // Reset failures on success
			return instanceAPI;
		} catch (err: any) {
			const msg = err?.message || String(err);
			const failures = (instanceApiFailures.get(cacheKey) || 0) + 1;
			instanceApiFailures.set(cacheKey, failures);

			if (failures > 1) {
				instanceApiCache.delete(cacheKey);
				instanceApiFailures.delete(cacheKey);
				return null; // Stop trying until instance is running again
			}

			if (msg.includes('Session.Exists')) {
				instanceApiCache.delete(cacheKey);
				return await performLogin();
			}
			throw logger.error('instanceLogin', `Failed to use cached instance API: ${msg}`);
		}
	}
	return await performLogin();
}

export async function getAllInstances({ fetch }: { fetch?: InstanceSearchFilter } = {}): Promise<SanitizedInstance[]> {
	try {
		const API = await apiLogin();
		const targets: IADSInstance[] = await API.ADSModule.GetInstances();
		const instancesList = targets.flatMap((target) => target.AvailableInstances).filter((instance) => instance.FriendlyName !== 'ADS');
		const concurrency = Number(process.env.INSTANCE_CONCURRENCY) || 6;

		const processInstance = async (instance: Instance): Promise<SanitizedInstance | null> => {
			try {
				const WelcomeMessage = (instance as any).WelcomeMessage ?? '';
				const modpackInfo = getModpack(WelcomeMessage);
				let nextScheduled: IntervalTriggerResult[] | null = null;
				let isInstanceLinked: boolean = false;

				const metrics: any = { ...(instance.Metrics || {}) };
				if (metrics['Active Users']) metrics['Active Users'] = { ...metrics['Active Users'], PlayerList: [] } as any;

				const serverIconP = getImageSource(instance.DisplayImageSource).catch(() => '');

				// Cooldown: skip API-heavy calls if this instance is currently on hold
				const instanceOnHold = isInstanceOnHold(instance.InstanceID);

				let playerListP: Promise<any[]> = Promise.resolve([]);
				if (!instanceOnHold && API && instance.Running && metrics['Active Users'] && metrics['Active Users'].RawValue > 0)
					playerListP = getOnlinePlayers(instance).catch(() => {
						throw new Error('getOnlinePlayers failed');
					});

				let scheduleP: Promise<{ scheduleOffset: any | null; rawNextScheduled: any[] }> = Promise.resolve({ scheduleOffset: null, rawNextScheduled: [] });
				if (!instanceOnHold && instance.Running) {
					const redisKey = `instanceCache:${instance.InstanceID}`;
					const cached = await getJson<any>(redis, redisKey).catch(() => null);
					if (cached && (cached.rawNextScheduled || cached.scheduleOffset)) {
						scheduleP = Promise.resolve({ scheduleOffset: cached.scheduleOffset ?? null, rawNextScheduled: cached.rawNextScheduled ?? [] });
					} else {
						scheduleP = (async () => {
							const scheduleOffset = await getInstanceConfig(instance.InstanceID, instance.ModuleDisplayName || instance.Module, 'Core.AMP.ScheduleOffsetSeconds').catch(
								() => null
							);
							const rawNextScheduled = (await getIntervalTrigger(instance.InstanceID, instance.ModuleDisplayName || instance.Module, 'Both').catch(() => [])) || [];
							try {
								await setJson(redis, redisKey, { scheduleOffset, rawNextScheduled }, '.', 30); // 30 seconds
							} catch (err) {
								// ignore cache write failures
							}
							return { scheduleOffset, rawNextScheduled };
						})();
					}
				}

				const [serverIconRes, playerListRes, scheduleRes] = await Promise.allSettled([serverIconP, playerListP, scheduleP]);

				const serverIcon = serverIconRes.status === 'fulfilled' ? serverIconRes.value : '';
				const PlayerList = playerListRes.status === 'fulfilled' ? playerListRes.value : [];
				const { scheduleOffset, rawNextScheduled } = scheduleRes.status === 'fulfilled' ? scheduleRes.value : { scheduleOffset: null, rawNextScheduled: [] };

				// Update circuit breaker state based on subtask outcomes
				try {
					if (playerListRes.status === 'rejected' || scheduleRes.status === 'rejected') {
						noteInstanceFailure(instance.InstanceID);
					} else {
						clearInstanceHold(instance.InstanceID);
					}
				} catch (err) {
					// ignore cooldown bookkeeping errors
				}
				if (metrics['Active Users']) metrics['Active Users'].PlayerList = PlayerList;

				let appState: string;
				if (typeof instance.AppState === 'number') appState = AppStateMap[instance.AppState as keyof typeof AppStateMap] || 'Offline';
				else appState = instance.AppState;

				const port = getPort(instance);

				if (instance.Running) {
					const offsetSeconds = Number(scheduleOffset?.key?.CurrentValue) || 0;
					nextScheduled = (rawNextScheduled || []).map((item: any) => {
						const nextrunMs = (item.data.nextrunMs ?? 0) + offsetSeconds * 1000;
						const nextRunDate = new Date((item.data.nextRunDate ? new Date(item.data.nextRunDate).getTime() : 0) + offsetSeconds * 1000);
						return { type: item.type, data: { nextrunMs, nextRunDate } };
					});
					isInstanceLinked = (mongoCache.get('linkedInstanceIDs') as Set<string> | undefined)?.has(instance.InstanceID) ?? false;
				}

				const existingHistory = metricsHistoryStore.get(instance.InstanceID) ?? createEmptyHistory();
				const updatedHistory = cloneHistory(existingHistory);
				for (const [historyKey, aliases] of Object.entries(trackedMetricAliases) as [keyof MetricSimple, string[]][]) {
					const sourceKey = aliases.find((alias) => metrics[alias]);
					if (!sourceKey) continue;
					const metricEntry = metrics[sourceKey];
					const rawValue =
						typeof metricEntry?.RawValue === 'number' && !Number.isNaN(metricEntry.RawValue)
							? metricEntry.RawValue
							: typeof metricEntry?.Percent === 'number' && !Number.isNaN(metricEntry.Percent)
							? metricEntry.Percent
							: null;
					if (rawValue === null) continue;
					const history = updatedHistory[historyKey];
					history.push(rawValue);
					if (history.length > METRICS_HISTORY_LENGTH) history.splice(0, history.length - METRICS_HISTORY_LENGTH);
				}
				metricsHistoryStore.set(instance.InstanceID, updatedHistory);
				const metricsHistory = cloneHistory(updatedHistory);

				const mappedInstance: SanitizedInstance = {
					InstanceID: instance.InstanceID,
					TargetID: instance.TargetID,
					InstanceName: instance.InstanceName,
					FriendlyName: instance.FriendlyName,
					WelcomeMessage: WelcomeMessage,
					Description: instance.Description || '',
					ServerIcon: serverIcon,
					AppState: appState,
					Module: instance.Module || instance.ModuleDisplayName,
					Running: instance.Running,
					Suspended: instance.Suspended,
					isChatlinked: isInstanceLinked,
					ServerModpack: modpackInfo.isModpack ? { Name: modpackInfo.modpackName, URL: modpackInfo.modpackUrl } : undefined,
					NextRestart: nextScheduled?.find((s) => s.type === 'Restart')?.data || null,
					NextBackup: nextScheduled?.find((s) => s.type === 'Backup')?.data || null,
					ConnectionInfo: { Port: port },
					Metrics: metrics,
					MetricsHistory: metricsHistory,
				};
				return mappedInstance;
			} catch (err) {
				logger.warn('getAllInstances', `Failed to process instance ${instance.InstanceID}: ${String(err)}`);
				return null;
			}
		};

		const allResults = await mapWithConcurrency(instancesList, processInstance, concurrency);
		let allInstances: SanitizedInstance[] = allResults.filter((r): r is SanitizedInstance => !!r);

		switch (fetch) {
			case 'running_and_not_hidden':
				allInstances = allInstances.filter((instance) => instance.Running === true && instance.WelcomeMessage !== 'hidden');
				break;
			case 'running':
				allInstances = allInstances.filter((instance) => instance.Running === true);
				break;
			case 'not_hidden':
				allInstances = allInstances.filter((instance) => instance.WelcomeMessage !== 'hidden');
				break;
			case 'all':
				break;
		}

		allInstances.sort((a, b) => {
			// Running Minecraft first
			if (a.Running && a.Module === 'Minecraft' && (!b.Running || b.Module !== 'Minecraft')) return -1;
			if (b.Running && b.Module === 'Minecraft' && (!a.Running || a.Module !== 'Minecraft')) return 1;

			// Other running instances next
			if (a.Running && !b.Running) return -1;
			if (!a.Running && b.Running) return 1;

			return a.FriendlyName.localeCompare(b.FriendlyName);
		});
		return allInstances;
	} catch (error) {
		console.log(error);
		throw logger.error('getAllInstances', 'Failed to fetch instances from AMP');
	}
}

export async function getOnlinePlayers(instance: Instance): Promise<{ UserID: string; Username: string }[]> {
	try {
		if (!instance.Running) return [];
		const moduleName = instance.ModuleDisplayName || instance.Module;
		const API = await instanceLogin(instance.InstanceID, moduleName as keyof ModuleTypeMap);
		if (!API) return [];
		const getPlayers = await API.Core.GetUserList();
		if (!getPlayers) return [];

		return Object.entries(getPlayers).map(([UserID, Username]) => ({
			UserID: UserID.replace(/^Steam_/, ''),
			Username: Username as string,
		}));
	} catch (error) {
		logger.error(`getOnlinePlayers`, `Failed to fetch online players for ${instance.FriendlyName}`);
		return [];
	}
}

export async function getServerPlayerInfo(instance: SanitizedInstance): Promise<{ currentPlayers: { UserID: string; Username: string }[]; maxPlayers: number }> {
	const moduleName = instance.Module;
	const API = await instanceLogin(instance.InstanceID, moduleName as keyof ModuleTypeMap);
	if (!API) return { currentPlayers: [], maxPlayers: 0 };
	const searchNodes = moduleName === 'Minecraft' ? 'MinecraftModule.Limits.MaxPlayers' : 'Meta.GenericModule.$MaxUsers';
	const [getPlayers, configInfo] = await Promise.all([API.Core.GetUserList(), API.Core.GetConfigs([searchNodes])]);
	const maxPlayers = configInfo[0].CurrentValue;

	const currentPlayers = Object.entries(getPlayers).map(([UserID, Username]) => ({
		UserID: UserID.replace(/^Steam_/, ''),
		Username: Username as string,
	}));

	return { currentPlayers, maxPlayers };
}

export async function sendServerConsoleCommand(
	instanceId: string,
	module: string,
	command: string,
	options?: { returnResult: false | boolean }
): Promise<{ success: boolean; data: string | undefined }> {
	try {
		const API = await instanceLogin(instanceId, module as keyof ModuleTypeMap);
		if (!API) return { success: false, data: undefined };

		if (options?.returnResult) {
			await Promise.all([API.Core.GetUpdates(), API.Core.SendConsoleMessage(command), wait(250)]);
			const consoleResponse = await API.Core.GetUpdates();
			const consoleOutput = consoleResponse.ConsoleEntries.sort((a: any, b: any) => a.Timestamp - b.Timestamp);
			const cleanOutput = consoleOutput.map((i) => `${i.Contents}`).join('\n') || 'No console output returned';
			return { success: true, data: cleanOutput };
		} else {
			await API.Core.SendConsoleMessage(command);
			return { success: true, data: undefined };
		}
	} catch (error) {
		logger.error('sendServerConsoleCommand', `Failed to send console command to ${instanceId}`);
		return { success: false, data: undefined };
	}
}
