import { AppStateMap, InstanceSearchFilter, IntervalTriggerResult, ModuleTypeMap } from '../../types/ampTypes/ampTypes';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { ADS, IADSInstance, Instance } from '@neuralnexus/ampapi';
import { getIntervalTrigger } from './intervalFuncs';
import { getModpack, getPort, wait } from '../utils';
import { getImageSource } from './getSourceImage';
import logger from '../logger';
import { getInstanceConfig } from './configFuncs';
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

export async function instanceLogin<K extends keyof ModuleTypeMap>(instanceID: string, instanceModule: K): Promise<ModuleTypeMap[K] | null> {
	const cacheKey = `${instanceID}:${instanceModule}`;
	let instanceAPI = instanceApiCache.get(cacheKey) as ModuleTypeMap[K] | undefined;

	// Helper to (re)login and update cache
	const doLogin = async () => {
		const API = await apiLogin();
		const newAPI = await API.InstanceLogin<ModuleTypeMap[K]>(instanceID, instanceModule);
		instanceApiCache.set(cacheKey, newAPI);
		instanceApiFailures.set(cacheKey, 0); // Reset failures on success
		return newAPI as ModuleTypeMap[K];
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
				return await doLogin();
			}
			throw logger.error('instanceLogin', `Failed to use cached instance API: ${msg}`);
		}
	}
	return await doLogin();
}

export async function getAllInstances({ fetch }: { fetch?: InstanceSearchFilter } = {}): Promise<SanitizedInstance[]> {
	try {
		const API = await apiLogin();
		const targets: IADSInstance[] = await API.ADSModule.GetInstances();
		let allInstances: SanitizedInstance[] = await Promise.all(
			targets
				.flatMap((target) => target.AvailableInstances)
				.filter((instance) => instance.FriendlyName !== 'ADS')
				.map(async (instance: Instance) => {
					// Define the WelcomeMessage as a string to avoid type issues
					const WelcomeMessage = (instance as any).WelcomeMessage ?? '';
					const modpackInfo = getModpack(WelcomeMessage);
					let nextScheduled: IntervalTriggerResult[] | null = null;
					// Get server icon
					const serverIcon = await getImageSource(instance.DisplayImageSource);

					// Metrics with player list if applicable
					const metrics: any = { ...(instance.Metrics || {}) };
					if (metrics['Active Users']) {
						metrics['Active Users'] = {
							...metrics['Active Users'],
							PlayerList: [],
						} as any;

						let PlayerList: any[] = [];
						if (API && instance.Running && metrics['Active Users'].RawValue > 0) {
							PlayerList = (await getOnlinePlayers(instance)) || [];
						}
						metrics['Active Users'].PlayerList = PlayerList;
					}

					// Appstate mapping
					let appState: string;
					if (typeof instance.AppState === 'number') {
						appState = AppStateMap[instance.AppState as keyof typeof AppStateMap] || 'Offline';
					} else {
						appState = instance.AppState;
					}

					// Get connection info
					const port = getPort(instance);

					// Get next scheduled restart/backup if applicable
					if (instance.Running) {
						const scheduleOffset = await getInstanceConfig(instance.InstanceID, instance.ModuleDisplayName || instance.Module, 'Core.AMP.ScheduleOffsetSeconds');
						const offsetSeconds = Number(scheduleOffset?.key?.CurrentValue) || 0;

						const rawNextScheduled = (await getIntervalTrigger(instance.InstanceID, instance.ModuleDisplayName || instance.Module, 'Both')) || [];
						nextScheduled = rawNextScheduled.map((item: any) => {
							const nextrunMs = (item.data.nextrunMs ?? 0) + offsetSeconds * 1000;
							const nextRunDate = new Date((item.data.nextRunDate ? new Date(item.data.nextRunDate).getTime() : 0) + offsetSeconds * 1000);
							return {
								type: item.type,
								data: { nextrunMs, nextRunDate },
							};
						});
					}

					const mappedInstance: SanitizedInstance = {
						InstanceID: instance.InstanceID,
						TargetID: instance.TargetID,
						InstanceName: instance.InstanceName,
						FriendlyName: instance.FriendlyName,
						WelcomeMessage: WelcomeMessage,
						Description: instance.Description || '',
						ServerModpack: modpackInfo.isModpack ? { Name: modpackInfo.modpackName, URL: modpackInfo.modpackUrl } : undefined,
						ServerIcon: serverIcon,
						Module: instance.Module || instance.ModuleDisplayName,
						Running: instance.Running,
						AppState: appState,
						Suspended: instance.Suspended,
						NextRestart: nextScheduled?.find((s) => s.type === 'Restart')?.data || null,
						NextBackup: nextScheduled?.find((s) => s.type === 'Backup')?.data || null,
						Metrics: metrics,
						ConnectionInfo: { Port: port },
					};
					return mappedInstance;
				})
		);

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
