import { ModuleTypeMap } from '../../types/ampTypes/ampTypes';
import { ADS } from '@neuralnexus/ampapi';
import logger from '../logger';
let globalAPI: ADS;

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
				return null;
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
