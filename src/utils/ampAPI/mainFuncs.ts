import { ExtendedInstance, AppStateMap, InstanceSearchFilter, ModuleTypeMap } from '../../types/ampTypes/ampTypes';
import { ADS, IADSInstance, Instance } from '@neuralnexus/ampapi';
import { getImageSource } from './getSourceImage';
const instanceApiCache = new Map<string, any>();
import logger from '../logger';
import { getModpack } from '../utils';
let globalAPI: ADS;

export async function apiLogin(): Promise<ADS> {
	try {
		const { AMP_URI, AMP_USER, AMP_PASS } = process.env;
		if (!AMP_URI || !AMP_USER || !AMP_PASS) throw new Error('AMP_URI, AMP_USER, and AMP_PASS environment variables must be defined');
		if (globalAPI) return globalAPI;
		const API = new ADS(AMP_URI, AMP_USER, AMP_PASS);
		await API.APILogin();
		globalAPI = API;
		return globalAPI;
	} catch (error) {
		throw logger.error('apiLogin', error instanceof Error ? error.message : String(error));
	}
}

export async function instanceLogin<K extends keyof ModuleTypeMap>(instanceID: string, instanceModule: K): Promise<ModuleTypeMap[K]> {
	try {
		const cacheKey = `${instanceID}:${instanceModule}`;
		if (instanceApiCache.has(cacheKey)) {
			return instanceApiCache.get(cacheKey) as ModuleTypeMap[K];
		}
		const API = await apiLogin();
		const instanceAPI = await API.InstanceLogin<ModuleTypeMap[K]>(instanceID, instanceModule);
		instanceApiCache.set(cacheKey, instanceAPI);
		return instanceAPI as ModuleTypeMap[K];
	} catch (error) {
		throw logger.error('instanceLogin', error instanceof Error ? error.message : String(error));
	}
}

export async function getAllInstances({ fetch }: { fetch?: InstanceSearchFilter } = {}): Promise<ExtendedInstance[]> {
	try {
		const API = await apiLogin();
		const targets: IADSInstance[] = await API.ADSModule.GetInstances();
		let allInstances: ExtendedInstance[] = await Promise.all(
			targets
				.flatMap((target) => target.AvailableInstances)
				.filter((instance) => instance.FriendlyName !== 'ADS')
				.map(async (instance: Instance) => {
					let PlayerList: any[] = [];
					if (instance.Running) {
						PlayerList = (await getOnlinePlayers(instance)) || [];
					}

					// Define the WelcomeMessage as a string to avoid type issues
					const WelcomeMessage = (instance as any).WelcomeMessage ?? '';
					const modpackInfo = getModpack(WelcomeMessage);

					// Get server icon
					const serverIcon = await getImageSource(instance.DisplayImageSource);

					// Clone metrics and append PlayerInfo to 'Active Users' metric
					const metrics: any = { ...(instance.Metrics || {}) };
					if (metrics['Active Users']) {
						metrics['Active Users'] = {
							...metrics['Active Users'],
							PlayerList: PlayerList,
						} as any;
					}

					let appState: string;
					if (typeof instance.AppState === 'number') {
						appState = AppStateMap[instance.AppState as keyof typeof AppStateMap] || 'Offline';
					} else {
						appState = instance.AppState;
					}

					const mappedInstance: ExtendedInstance = {
						...instance,
						WelcomeMessage: WelcomeMessage,
						AppState: appState,
						ServerIcon: serverIcon,
						ServerModpack: modpackInfo.isModpack ? { Name: modpackInfo.modpackName, URL: modpackInfo.modpackUrl } : undefined,
						Metrics: metrics,
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
		throw logger.error('getAllInstances', error instanceof Error ? error.message : String(error));
	}
}

export async function getOnlinePlayers(instance: Instance): Promise<{ UserID: string; Username: string }[]> {
	try {
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
		logger.error('getOnlinePlayers', error instanceof Error ? error.message : String(error));
		return [];
	}
}

export async function getServerPlayerInfo(instance: ExtendedInstance): Promise<{ currentPlayers: { UserID: string; Username: string }[]; maxPlayers: number }> {
	const moduleName = instance.ModuleDisplayName || instance.Module;
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

export async function sendServerConsoleCommand(instanceId: string, module: string, command: string): Promise<void> {
	try {
		const API = await instanceLogin(instanceId, module as keyof ModuleTypeMap);
		const result = await API.Core.SendConsoleMessage(command);
		return result;
	} catch (error) {
		logger.error('sendServerConsoleCommand', error instanceof Error ? error.message : String(error));
		throw error;
	}
}
