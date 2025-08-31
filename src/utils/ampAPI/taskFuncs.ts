import { wait } from '../utils';
import { SchedulerJobs, ModuleTypeMap, TaskToAdd } from '../../types/ampTypes/ampTypes';
import { instanceLogin } from './main';

export async function loginAndGetSchedule(instanceID: string, moduleName: string) {
	const API = await instanceLogin(instanceID, moduleName as keyof ModuleTypeMap);
	const scheduleData = await API.Core.GetScheduleData();
	return { API, scheduleData } as { API: any; scheduleData: any };
}

async function addTriggerToInstance(instanceID: string, moduleName: string, triggerData: SchedulerJobs<any>['triggerDescription']) {
	try {
		const { API, scheduleData } = await loginAndGetSchedule(instanceID, moduleName);
		if (!scheduleData) throw new Error('No scheduler data found');
		const fetchedTrigger = scheduleData.AvailableTriggers.find((t: any) => t.Description === triggerData);
		if (!fetchedTrigger) throw new Error('No matching trigger found');
		await API.Core.AddEventTrigger(fetchedTrigger.Id);
		return {
			success: true,
			message: `Successfully added trigger ${fetchedTrigger.Description}`,
			data: { triggerId: fetchedTrigger.Id, triggerDesc: fetchedTrigger.Description },
		};
	} catch (error) {
		console.error('Error adding trigger to instance:', error);
		return { success: false, error: (error as Error).message || String(error), data: { triggerDesc: triggerData } };
	}
}

async function removeTriggerFromInstance(instanceID: string, moduleName: string, triggerDescription: SchedulerJobs<any>['triggerDescription']) {
	try {
		const { API, scheduleData } = await loginAndGetSchedule(instanceID, moduleName);
		if (!scheduleData) throw new Error('No scheduler data found');
		const fetchedTrigger = scheduleData.PopulatedTriggers.find((t: any) => t.Description === triggerDescription);
		if (!fetchedTrigger) throw new Error('No matching trigger found');
		await API.Core.DeleteTrigger(fetchedTrigger.Id);
		return {
			success: true,
			message: `Successfully removed trigger ${fetchedTrigger.Description}`,
			data: { triggerId: fetchedTrigger.Id, triggerDesc: fetchedTrigger.Description },
		};
	} catch (error) {
		console.error('Error removing trigger from instance:', error);
		return { success: false, error: (error as Error).message || String(error), data: { triggerDesc: triggerDescription } };
	}
}

async function addTasktoTrigger(instanceID: string, moduleName: string, triggerDescription: SchedulerJobs<any>['triggerDescription'], taskData: TaskToAdd<any>) {
	try {
		const { API, scheduleData } = await loginAndGetSchedule(instanceID, moduleName);
		if (!scheduleData) throw new Error('No scheduler data found');
		const fetchedTrigger = scheduleData.PopulatedTriggers.filter((t: any) => t.Description === triggerDescription);
		if (!fetchedTrigger.length) throw new Error('No matching trigger found');
		const fetchedTask = scheduleData.AvailableMethods.filter((t: any) => t.Name === taskData.taskMethod);
		if (!fetchedTask.length) throw new Error('No matching task found');

		const [triggerId, triggerDesc] = [fetchedTrigger[0].Id, fetchedTrigger[0].Description];
		const [taskId, taskDesc] = [fetchedTask[0].Id, fetchedTask[0].Description];

		await API.Core.AddTask(triggerId, taskId, taskData.dictionary);
		await API.Core.SetTriggerEnabled(triggerId, true);
		return { success: true, message: `Successfully added ${taskDesc} to ${triggerDesc}`, data: { triggerId, triggerDesc, taskId, taskDesc } };
	} catch (error) {
		console.error('Error adding task to trigger:', error);
		return { success: false, error: (error as Error).message || String(error), data: { triggerDesc: triggerDescription } };
	}
}

async function removeTaskFromTrigger(instanceID: string, moduleName: string, triggerDescription: SchedulerJobs<any>['triggerDescription'], taskData: TaskToAdd<any>) {
	try {
		const { API, scheduleData } = await loginAndGetSchedule(instanceID, moduleName);
		if (!scheduleData) throw new Error('No scheduler data found');
		const fetchedTrigger = scheduleData.PopulatedTriggers.filter((t: any) => t.Description === triggerDescription);
		if (!fetchedTrigger.length) throw new Error('No matching trigger found');
		const fetchedTask = scheduleData.AvailableMethods.filter((t: any) => t.Name === taskData.taskMethod);
		if (!fetchedTask.length) throw new Error('No matching task found');
		const triggerTask = fetchedTrigger[0].Tasks.find((t: any) => t.TaskMethodName === fetchedTask[0].Id);
		if (!triggerTask) throw new Error('No matching task found in trigger');

		const [triggerId, triggerDesc] = [fetchedTrigger[0].Id, fetchedTrigger[0].Description];
		const [taskId, taskDesc] = [triggerTask.Id, fetchedTask[0].Description];

		await API.Core.DeleteTask(triggerId, taskId);
		return { success: true, message: `Successfully removed ${taskDesc} from ${triggerDesc}`, data: { triggerId, triggerDesc, taskId, taskDesc } };
	} catch (error) {
		console.error('Error removing task from trigger:', error);
		return { success: false, error: (error as Error).message || String(error), data: { triggerDesc: triggerDescription, taskDesc: taskData.taskMethod } };
	}
}

export async function applySchedulerJobs(instanceID: string, moduleName: string, jobs: SchedulerJobs<any>[]) {
	if (!jobs || typeof jobs[Symbol.iterator] !== 'function') {
		throw new TypeError('jobs is not iterable');
	}
	const successTriggers: { triggerDesc: string; tasks: string[]; total: number; failedCount: number }[] = [];
	const failedTriggers: { triggerDesc: string; error?: string }[] = [];
	const successTasks: { triggerDesc: string; taskDesc: string }[] = [];
	const failedTasks: { triggerDesc: string; taskDesc: string; error?: string }[] = [];

	// Phase 1: add all triggers
	const triggerResults: Array<{ job: SchedulerJobs<any>; result: any }> = [];
	for (const job of jobs) {
		const triggerResult = await addTriggerToInstance(instanceID, moduleName, job.triggerDescription);
		const triggerDesc = triggerResult.data?.triggerDesc || job.triggerDescription;
		if (!triggerResult.success) {
			failedTriggers.push({ triggerDesc, error: triggerResult.error });
		}
		triggerResults.push({ job, result: triggerResult });
		await wait(25);
	}

	// Phase 2: add tasks sequentially for triggers that were created successfully
	for (const tr of triggerResults) {
		const job = tr.job;
		const triggerResult = tr.result;
		const triggerDesc = triggerResult.data?.triggerDesc || job.triggerDescription;

		if (!triggerResult.success) continue;

		const tasksAddedForTrigger: string[] = [];
		for (const task of job.tasksToAdd) {
			try {
				const r = await addTasktoTrigger(instanceID, moduleName, job.triggerDescription, task);
				if (r && r.success) {
					const td = r.data?.taskDesc || task.taskMethod;
					successTasks.push({ triggerDesc, taskDesc: td });
					tasksAddedForTrigger.push(td);
				} else {
					const td = r?.data?.taskDesc || task.taskMethod;
					failedTasks.push({ triggerDesc, taskDesc: td, error: r?.error });
				}
			} catch (err) {
				const td = task.taskMethod;
				failedTasks.push({ triggerDesc, taskDesc: td, error: String(err) });
			}
		}

		const totalTasksForJob = job.tasksToAdd.length;
		const failedCountForJob = totalTasksForJob - tasksAddedForTrigger.length;
		successTriggers.push({ triggerDesc, tasks: tasksAddedForTrigger, total: totalTasksForJob, failedCount: failedCountForJob });
		await wait(25);
	}

	// Build Markdown summaries
	const successLines: string[] = ['## Successful Additions'];
	if (successTriggers.length === 0) {
		successLines.push('- (none)');
	} else {
		for (const t of successTriggers) {
			successLines.push(`- ${t.triggerDesc}`);
			successLines.push(`  - Added ${t.tasks.length} subtasks`);
		}
	}

	const failureLines: string[] = ['## Failed Additions'];
	if (failedTriggers.length === 0 && failedTasks.length === 0) {
		failureLines.push('- (none)');
	} else {
		for (const ft of failedTriggers) {
			failureLines.push(`- ${ft.triggerDesc}  — ${ft.error || 'unknown error'}`);
		}
		const failedByTrigger: Record<string, number> = {};
		for (const ft of failedTasks) {
			failedByTrigger[ft.triggerDesc] = (failedByTrigger[ft.triggerDesc] || 0) + 1;
		}
		for (const [tr, count] of Object.entries(failedByTrigger)) {
			failureLines.push(`- ${tr}`);
			failureLines.push(`  - Failed ${count} subtasks`);
		}
	}

	const successMd = successLines.join('\n');
	const failureMd = failureLines.join('\n');

	return { successTriggers, failedTriggers, successTasks, failedTasks, successMd, failureMd };
}

export async function removeSchedulerJobs(instanceID: string, moduleName: string, jobs: SchedulerJobs<any>[]) {
	const successTriggers: { triggerDesc: string; tasks: string[]; total: number; failedCount: number }[] = [];
	const failedTriggers: { triggerDesc: string; error?: string }[] = [];
	const successTasks: { triggerDesc: string; taskDesc: string }[] = [];
	const failedTasks: { triggerDesc: string; taskDesc: string; error?: string }[] = [];

	// Phase 1: remove tasks for all triggers
	const taskRemovalResults: Array<{ job: SchedulerJobs<any>; tasksRemoved: string[] }> = [];
	for (const job of jobs) {
		const triggerDesc = job.triggerDescription;
		const tasksRemovedForTrigger: string[] = [];
		for (const task of job.tasksToAdd) {
			try {
				const r = await removeTaskFromTrigger(instanceID, moduleName, job.triggerDescription, task);
				if (r && r.success) {
					const td = r.data?.taskDesc || task.taskMethod;
					successTasks.push({ triggerDesc, taskDesc: td });
					tasksRemovedForTrigger.push(td);
				} else {
					const td = r?.data?.taskDesc || task.taskMethod;
					failedTasks.push({ triggerDesc, taskDesc: td, error: r?.error });
				}
			} catch (err) {
				const td = task.taskMethod;
				failedTasks.push({ triggerDesc, taskDesc: td, error: String(err) });
			}
		}
		taskRemovalResults.push({ job, tasksRemoved: tasksRemovedForTrigger });
		await wait(25);
	}

	// Phase 2: remove triggers for all jobs
	for (const tr of taskRemovalResults) {
		const job = tr.job;
		const triggerDesc = job.triggerDescription;
		const tasksRemovedForTrigger = tr.tasksRemoved;

		const triggerResult = await removeTriggerFromInstance(instanceID, moduleName, job.triggerDescription);
		const totalTasksForJob = job.tasksToAdd.length;
		const failedCountForJob = totalTasksForJob - tasksRemovedForTrigger.length;
		if (!triggerResult.success) {
			failedTriggers.push({ triggerDesc, error: triggerResult.error });
		} else {
			successTriggers.push({ triggerDesc, tasks: tasksRemovedForTrigger, total: totalTasksForJob, failedCount: failedCountForJob });
		}

		await wait(25);
	}

	// Build Markdown summaries
	const successLines: string[] = ['## Successful Removals'];
	if (successTriggers.length === 0) {
		successLines.push('- (none)');
	} else {
		for (const t of successTriggers) {
			successLines.push(`- ${t.triggerDesc}`);
			successLines.push(`  - Removed ${t.tasks.length} subtasks`);
		}
	}

	const failureLines: string[] = ['## Failed Removals'];
	if (failedTriggers.length === 0 && failedTasks.length === 0) {
		failureLines.push('- (none)');
	} else {
		for (const ft of failedTriggers) {
			failureLines.push(`- ${ft.triggerDesc}  — ${ft.error || 'unknown error'}`);
		}
		const failedByTrigger: Record<string, number> = {};
		for (const ft of failedTasks) {
			failedByTrigger[ft.triggerDesc] = (failedByTrigger[ft.triggerDesc] || 0) + 1;
		}
		for (const [tr, count] of Object.entries(failedByTrigger)) {
			failureLines.push(`- ${tr}`);
			failureLines.push(`  - Failed ${count} subtasks`);
		}
	}

	const successMd = successLines.join('\n');
	const failureMd = failureLines.join('\n');

	return { successTriggers, failedTriggers, successTasks, failedTasks, successMd, failureMd };
}
