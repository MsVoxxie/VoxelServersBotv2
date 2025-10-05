import { Instance } from '@neuralnexus/ampapi';

export async function wait(ms: number) {
	return new Promise((res) => setTimeout(res, ms));
}

export function trimString(str: string, max: number): string {
	return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}

export function msToHuman(ms: number) {
	const parts = [];
	const seconds = Math.floor((ms / 1000) % 60);
	const minutes = Math.floor((ms / (1000 * 60)) % 60);
	const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
	const days = Math.floor(ms / (1000 * 60 * 60 * 24));
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (seconds > 0) parts.push(`${seconds}s`);
	return parts;
}

export function formatMCUUID(uuid: string) {
	return uuid.replace(/^([a-fA-F0-9]{8})([a-fA-F0-9]{4})([a-fA-F0-9]{4})([a-fA-F0-9]{4})([a-fA-F0-9]{12})$/, '$1-$2-$3-$4-$5');
}

export function getModpack(str: string): { modpackName: string; modpackUrl: string; isModpack: boolean } {
	let [modpackName = '', modpackUrl = ''] = str.split('||');
	modpackName = modpackName.trim();
	modpackUrl = modpackUrl.trim();
	const urlPattern = /^https?:\/\/.+/i;
	const isModpack = !!modpackUrl && urlPattern.test(modpackUrl);
	return { modpackName, modpackUrl, isModpack };
}

export function getPort(instance: Instance) {
	const deploymentArgs = instance.DeploymentArgs;
	if (!deploymentArgs) return null;

	const mcPort = deploymentArgs['MinecraftModule.Minecraft.PortNumber'];
	if (mcPort) {
		return parseInt(mcPort, 10);
	}

	const rawPorts = deploymentArgs['GenericModule.App.Ports'];
	if (rawPorts) {
		try {
			const ports = JSON.parse(rawPorts);
			const primary = ports.find((p: any) => p.Ref === 'ServerPort') || ports[0];
			return primary?.Port || null;
		} catch (err) {
			console.error('Failed to parse ports:', err);
			return null;
		}
	}
	return null;
}
