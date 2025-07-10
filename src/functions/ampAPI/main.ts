import { ADS, IADSInstance, Instance } from '@neuralnexus/ampapi';

export async function apiLogin(): Promise<ADS> {
	const { AMP_URI, AMP_USER, AMP_PASS } = process.env;
	if (!AMP_URI || !AMP_USER || !AMP_PASS) throw new Error('AMP_URI, AMP_USER, and AMP_PASS environment variables must be defined');
	const API = new ADS(AMP_URI, AMP_USER, AMP_PASS);
	await API.APILogin();
	return API;
}

export async function getAllInstances(): Promise<Instance[]> {
	const API = await apiLogin();
	const targets: IADSInstance[] = await API.ADSModule.GetInstances();
	let allInstances: Instance[] = targets.flatMap((target) => target.AvailableInstances);
	allInstances = allInstances.filter((instance) => instance.FriendlyName !== 'ADS');
	return allInstances;
}
