import { SchedulerJobs, ModuleTypeMap } from '../../types/ampTypes/ampTypes';

const sharedPostDetails = {
	URI: `${process.env.API_URI}/server/chatlink`,
	ContentType: 'application/json',
};

const minecraftRestarts: SchedulerJobs<'Minecraft'>[] = [];

const genericRestarts: SchedulerJobs<'GenericModule'>[] = [];

// A keyed collection so callers can pick by module name
export const restartJobs: { [K in keyof ModuleTypeMap]: SchedulerJobs<K>[] } = {
	Minecraft: minecraftRestarts,
	GenericModule: genericRestarts,
};
