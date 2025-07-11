import { ADS, IADSInstance, Instance } from '@neuralnexus/ampapi';
import { ExtendedInstance } from '../../types/ampTypes';

export async function apiLogin(): Promise<ADS> {
	const { AMP_URI, AMP_USER, AMP_PASS } = process.env;
	if (!AMP_URI || !AMP_USER || !AMP_PASS) throw new Error('AMP_URI, AMP_USER, and AMP_PASS environment variables must be defined');
	const API = new ADS(AMP_URI, AMP_USER, AMP_PASS);
	await API.APILogin();
	return API;
}

export type InstanceFilter = 'all' | 'running' | 'not_hidden';
export async function getAllInstances({ fetch }: { fetch?: InstanceFilter } = {}): Promise<ExtendedInstance[]> {
	const API = await apiLogin();
	const targets: IADSInstance[] = await API.ADSModule.GetInstances();
	let allInstances: ExtendedInstance[] = targets
		.flatMap((target) => target.AvailableInstances)
		.filter((instance) => instance.FriendlyName !== 'ADS')
		.map((instance) => instance as ExtendedInstance);

	if (fetch === 'running') {
		allInstances = allInstances.filter((instance) => instance.Running === true);
	} else if (fetch === 'not_hidden') {
		allInstances = allInstances.filter((instance) => instance.WelcomeMessage === 'hidden');
	}
	return allInstances;
}

export async function getInstanceById(InstanceID: string): Promise<Instance | null> {
	const API = await apiLogin();
	const targets: IADSInstance[] = await API.ADSModule.GetInstances();
	for (const target of targets) {
		const instance = target.AvailableInstances.find((inst) => inst.InstanceID === InstanceID);
		if (instance) return instance;
	}
	return null;
}
