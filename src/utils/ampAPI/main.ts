import { ADS, IADSInstance, Instance } from '@neuralnexus/ampapi';
import { ExtendedInstance, AppStateMap, InstanceSearchFilter } from '../../types/ampTypes';

export async function apiLogin(): Promise<ADS> {
	const { AMP_URI, AMP_USER, AMP_PASS } = process.env;
	if (!AMP_URI || !AMP_USER || !AMP_PASS) throw new Error('AMP_URI, AMP_USER, and AMP_PASS environment variables must be defined');
	const API = new ADS(AMP_URI, AMP_USER, AMP_PASS);
	await API.APILogin();
	return API;
}

export async function instanceLogin<T = any>(instanceID: string, instanceModule: string): Promise<T> {
	const API = await apiLogin();
	const instanceAPI = await API.InstanceLogin(instanceID, instanceModule);
	return instanceAPI as T;
}

export async function getAllInstances({ fetch }: { fetch?: InstanceSearchFilter } = {}): Promise<ExtendedInstance[]> {
	const API = await apiLogin();
	const targets: IADSInstance[] = await API.ADSModule.GetInstances();
	let allInstances: ExtendedInstance[] = await Promise.all(
		targets
			.flatMap((target) => target.AvailableInstances)
			.filter((instance) => instance.FriendlyName !== 'ADS')
			.map(async (instance) => {
				let PlayerList: any[] = [];
				if (instance.Running) {
					PlayerList = (await getOnlinePlayers(instance)) || [];
				}

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
					WelcomeMessage: (instance as any).WelcomeMessage ?? '',
					AppState: appState,
					Metrics: metrics,
				};
				return mappedInstance;
			})
	);

	if (fetch === 'running') {
		allInstances = allInstances.filter((instance) => instance.Running === true);
	} else if (fetch === 'not_hidden') {
		allInstances = allInstances.filter((instance) => instance.WelcomeMessage !== 'hidden');
	}
	return allInstances;
}

export async function getOnlinePlayers(instance: Instance): Promise<{ UserID: string; Username: string }[]> {
	try {
		const API = await instanceLogin(instance.InstanceID, instance.ModuleDisplayName || instance.Module);
		const getPlayers = await API.Core.GetUserList();
		return Object.entries(getPlayers).map(([UserID, Username]) => ({ UserID: UserID.replace(/^Steam_/, ''), Username: Username as string }));
	} catch (err) {
		return [];
	}
}
