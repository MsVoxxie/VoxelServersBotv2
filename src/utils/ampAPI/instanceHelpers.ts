// Imports
import { MetricSimple, PlayerList, SanitizedInstance, ScheduleCache } from '../../types/ampTypes/instanceTypes';
import { AppStateMap, IntervalTriggerResult, ModuleTypeMap } from '../../types/ampTypes/ampTypes';
import { IADSInstance, Instance } from '@neuralnexus/ampapi';
import { RedisKeys } from '../../types/redisKeys/keys';
import redis from '../../loaders/database/redisLoader';
import { getIntervalTrigger } from './intervalFuncs';
import { getImageSource } from './getSourceImage';
import { getInstanceConfig } from './configFuncs';
import { getJson, setJson } from '../redisHelpers';
import { getModpack, getPort } from '../utils';
import { mongoCache } from '../../vsb';
import { apiLogin, instanceLogin } from './apiFuncs';
import logger from '../logger';

// Caches
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

type CooldownEntry = { failures: number; backoffMs: number; cooldownUntil: number };
const instanceCooldowns = new Map<string, CooldownEntry>();

// Constants
const COOLDOWN_FAILURES = Number(process.env.COOLDOWN_FAILURES) || 3;
const COOLDOWN_BASE_MS = Number(process.env.COOLDOWN_BASE_MS) || 60_000; // 1 minute
const COOLDOWN_MAX_MS = Number(process.env.COOLDOWN_MAX_MS) || 15 * 60_000; // 15 minutes

// Fetch targets from ADS
export async function fetchAllTargetsFromAPI(): Promise<IADSInstance[]> {
	const API = await apiLogin();
	const targets = await API.ADSModule.GetInstances();
	return targets;
}

// Fetch server icon with safe fallback
export async function fetchServerIcon(instance: Instance): Promise<string> {
	try {
		return await getImageSource(instance.DisplayImageSource);
	} catch {
		return '';
	}
}

// Fetch player list if allowed
export async function fetchPlayerListIfAllowed(instance: Instance, instanceOnHold: boolean): Promise<PlayerList[]> {
	try {
		if (instanceOnHold || !instance.Running || !instance.Metrics?.['Active Users'] || instance.Metrics['Active Users'].RawValue <= 0) return [];
		return await getOnlinePlayers(instance);
	} catch {
		throw new Error('getOnlinePlayers failed');
	}
}

// Cooldown management

export function setInstanceCooldown(instanceId: string, failures: number) {
	const over = Math.max(0, failures - (COOLDOWN_FAILURES - 1));
	const backoff = Math.min(COOLDOWN_MAX_MS, COOLDOWN_BASE_MS * Math.pow(2, Math.max(0, over - 1)));
	instanceCooldowns.set(instanceId, { failures, backoffMs: backoff, cooldownUntil: Date.now() + backoff });
}

export function isInstanceOnHold(instanceId: string): boolean {
	const entry = instanceCooldowns.get(instanceId);
	if (!entry) return false;
	if (Date.now() < entry.cooldownUntil) return true;
	// cooldown expired
	instanceCooldowns.delete(instanceId);
	return false;
}

// Resolve schedule with short redis caching
export async function resolveInstanceSchedule(instance: Instance): Promise<ScheduleCache> {
	if (!instance.Running) return { scheduleOffset: null, rawNextScheduled: [] };
	const redisKey = RedisKeys.instanceCache(instance.InstanceID);
	try {
		const cached = await getJson<any>(redis, redisKey).catch(() => null);
		if (cached && (cached.rawNextScheduled || cached.scheduleOffset)) {
			return { scheduleOffset: cached.scheduleOffset ?? null, rawNextScheduled: cached.rawNextScheduled ?? [] };
		}
		const scheduleOffset = await getInstanceConfig(instance.InstanceID, instance.ModuleDisplayName || instance.Module, 'Core.AMP.ScheduleOffsetSeconds').catch(() => null);
		const rawNextScheduled = (await getIntervalTrigger(instance.InstanceID, instance.ModuleDisplayName || instance.Module, 'Both').catch(() => [])) || [];
		await setJson(redis, redisKey, { scheduleOffset, rawNextScheduled }, '.', 30).catch(() => {});
		return { scheduleOffset, rawNextScheduled };
	} catch {
		return { scheduleOffset: null, rawNextScheduled: [] };
	}
}

// Update metrics history safely and return cloned copy
export function updateAndGetMetricsHistory(instanceId: string, metrics: any): MetricSimple {
	const existingHistory = metricsHistoryStore.get(instanceId) ?? createEmptyHistory();
	const updated = cloneHistory(existingHistory);
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
		const history = updated[historyKey];
		history.push(rawValue);
		if (history.length > METRICS_HISTORY_LENGTH) history.splice(0, history.length - METRICS_HISTORY_LENGTH);
	}
	metricsHistoryStore.set(instanceId, updated);
	return cloneHistory(updated);
}

// Map instance + resolved data -> SanitizedInstance
export function mapInstanceToSanitized(
	instance: Instance,
	serverIcon: string,
	PlayerList: PlayerList[],
	scheduleRes: ScheduleCache,
	metricsHistory: MetricSimple
): SanitizedInstance {
	const metrics: any = { ...(instance.Metrics || {}) };
	if (metrics['Active Users']) metrics['Active Users'] = { ...metrics['Active Users'], PlayerList: [] } as any;
	if (metrics['Active Users']) metrics['Active Users'].PlayerList = PlayerList;

	let appState: string;
	if (typeof instance.AppState === 'number') appState = AppStateMap[instance.AppState as keyof typeof AppStateMap] || 'Offline';
	else appState = instance.AppState;

	const port = getPort(instance);

	let nextScheduled: IntervalTriggerResult[] | null = null;
	if (instance.Running) {
		const offsetSeconds = Number(scheduleRes.scheduleOffset?.key?.CurrentValue) || 0;
		nextScheduled = (scheduleRes.rawNextScheduled || []).map((item: any) => {
			const nextrunMs = (item.data.nextrunMs ?? 0) + offsetSeconds * 1000;
			const nextRunDate = new Date((item.data.nextRunDate ? new Date(item.data.nextRunDate).getTime() : 0) + offsetSeconds * 1000);
			return { type: item.type, data: { nextrunMs, nextRunDate } } as IntervalTriggerResult;
		});
	}

	const isInstanceLinked = (mongoCache.get('linkedInstanceIDs') as Set<string> | undefined)?.has(instance.InstanceID) ?? false;
	const modpackInfo = getModpack((instance as any).WelcomeMessage ?? '');

	return {
		InstanceID: instance.InstanceID,
		TargetID: instance.TargetID,
		InstanceName: instance.InstanceName,
		FriendlyName: instance.FriendlyName,
		WelcomeMessage: (instance as any).WelcomeMessage ?? '',
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
}

// Main per-instance processor using the small helpers
export async function processInstanceWrapper(instance: Instance): Promise<SanitizedInstance | null> {
	try {
		const instanceOnHold = isInstanceOnHold(instance.InstanceID);

		const [serverIconRes, scheduleResP] = await Promise.allSettled([fetchServerIcon(instance), resolveInstanceSchedule(instance)]);
		const serverIcon = serverIconRes.status === 'fulfilled' ? serverIconRes.value : '';
		const scheduleRes = scheduleResP.status === 'fulfilled' ? scheduleResP.value : { scheduleOffset: null, rawNextScheduled: [] };

		let playerList: PlayerList[] = [];
		try {
			playerList = await fetchPlayerListIfAllowed(instance, instanceOnHold);
		} catch {
			throw new Error('PLAYER_FETCH_FAILED');
		}

		const metricsHistory = updateAndGetMetricsHistory(instance.InstanceID, instance.Metrics || {});
		return mapInstanceToSanitized(instance, serverIcon, playerList, scheduleRes, metricsHistory);
	} catch (err) {
		logger.warn('getAllInstances', `Failed to process instance ${instance.InstanceID}: ${String(err)}`);
		return null;
	}
}

// Get online players for an instance
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

// Map helper with concurrency limit
export async function mapWithConcurrency<T, R>(items: T[], worker: (item: T, idx: number) => Promise<R>, concurrency: number): Promise<(R | undefined)[]> {
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
