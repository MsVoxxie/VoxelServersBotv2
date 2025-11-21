import { InstanceSearchFilter, ModuleTypeMap } from '../../types/ampTypes/ampTypes';
import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import logger from '../logger';
import { wait } from '../utils';
import { instanceLogin } from './apiFuncs';
import { fetchAllTargetsFromAPI, mapWithConcurrency, processInstanceWrapper } from './instanceHelpers';

// Refactored getAllInstances
export async function getAllInstances({ fetch }: { fetch?: InstanceSearchFilter } = {}): Promise<SanitizedInstance[]> {
	try {
		const targets = await fetchAllTargetsFromAPI();
		const instancesList = targets.flatMap((t) => t.AvailableInstances).filter((i) => i.FriendlyName !== 'ADS');
		const concurrency = Number(process.env.INSTANCE_CONCURRENCY) || 6;

		// Use same concurrency mapper
		const allResults = await mapWithConcurrency(
			instancesList,
			async (instance) => {
				const result = await processInstanceWrapper(instance);
				return result;
			},
			concurrency
		);

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
			if (a.Running && a.Module === 'Minecraft' && (!b.Running || b.Module !== 'Minecraft')) return -1;
			if (b.Running && b.Module === 'Minecraft' && (!a.Running || a.Module !== 'Minecraft')) return 1;
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

// Get current players and max players for server instance
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

// Send console command to server instance
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
