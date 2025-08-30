import { Job, ModuleTypeMap } from './../../types/ampTypes';
import { instanceLogin } from './main';

export async function getSchedulerData(instanceID: string, moduleName: string) {
	try {
		const instanceAPI = await instanceLogin(instanceID, moduleName as keyof ModuleTypeMap);
		const scheduleData = await instanceAPI.Core.GetScheduleData();
		return scheduleData;
	} catch (error) {
		console.error('Error fetching schedule data:', error);
		return [];
	}
}

export async function createJobsFromList(instanceID: string, moduleName: keyof ModuleTypeMap, jobList: Job<'Minecraft' | 'GenericModule'>[]) {
	try {
		const instanceAPI = await instanceLogin(instanceID, moduleName);
		let scheduleData = await instanceAPI.Core.GetScheduleData();

		for (const job of jobList) {
			const triggerDef = scheduleData.AvailableTriggers.find((t: any) => t.Description === job.triggerName);
			if (!triggerDef) {
				console.warn(`Trigger definition for '${job.triggerName}' not found. Skipping job.`);
				continue;
			}

			// Look for existing populated trigger instance that references this definition
			let triggerInstance = (scheduleData.PopulatedTriggers || []).find(
				(p: any) => p.TriggerDefinitionId === triggerDef.Id || p.DefinitionId === triggerDef.Id || p.Definition === triggerDef.Id || p.DefinitionIdentifier === triggerDef.Id
			);

			// If no instance exists, create one using AddEventTrigger (API expects the definition id)
			if (!triggerInstance) {
				try {
					await instanceAPI.Core.AddEventTrigger(triggerDef.Id);
					await instanceAPI.Core.SetTriggerEnabled(triggerDef.Id, true);
				} catch (err) {
					console.error('Failed to create trigger instance for', triggerDef.Id, err);
					continue;
				}

				// Poll for the populated trigger to appear (server may be slow to reflect new instance)
				const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
				const maxAttempts = 10;
				const intervalMs = 500;
				let attempts = 0;

				while (attempts < maxAttempts && !triggerInstance) {
					await wait(intervalMs);
					scheduleData = await instanceAPI.Core.GetScheduleData();
					triggerInstance = (scheduleData.PopulatedTriggers || []).find((p: any) => {
						// robust matching: check common property names or search whole object string
						if (!p) return false;
						if (
							p.TriggerDefinitionId === triggerDef.Id ||
							p.DefinitionId === triggerDef.Id ||
							p.Definition === triggerDef.Id ||
							p.DefinitionIdentifier === triggerDef.Id ||
							p.DefinitionIdentifier === triggerDef.Id
						) {
							return true;
						}
						try {
							return JSON.stringify(p).includes(triggerDef.Id);
						} catch {
							return false;
						}
					});
					attempts++;
				}

				if (!triggerInstance) {
					console.warn(`Unable to find populated trigger for definition ${triggerDef.Id} after ${maxAttempts} attempts`);
					continue;
				}
			}

			const triggerId = triggerInstance?.Id || triggerInstance?.TriggerID || triggerInstance?.TriggerId;
			if (!triggerId) {
				console.warn(`Unable to determine trigger instance id for '${job.triggerName}'. Skipping tasks.`);
				continue;
			}
			console.log(`Trigger '${job.triggerName}' ready (id=${triggerId}).`);

			for (const task of job.tasksToAdd) {
				const methodObj = scheduleData.AvailableMethods.find((m: any) => m.Name === task.taskName);
				if (!methodObj) {
					console.warn(`Method '${task.taskName}' not found. Skipping task.`);
					continue;
				}

				// ParameterMapping must be Dictionary<string, string>
				const parameterMapping: Record<string, string> = {};
				for (const [k, v] of Object.entries(task.dictionary || {})) {
					parameterMapping[k] = v === undefined || v === null ? '' : String(v);
				}

				try {
					const addRes: any = await instanceAPI.Core.AddTask(triggerId, methodObj.Id, parameterMapping);

					if (!addRes) {
						console.warn(`AddTask returned empty response for '${task.taskName}' -> '${job.triggerName}'`);
						continue;
					}

					// ActionResult shape: { Status: boolean, Reason?: string, ... }
					if (addRes.Status === false) {
						console.warn(`Failed to add task '${task.taskName}' to '${job.triggerName}': ${addRes.Reason || JSON.stringify(addRes)}`);
						continue;
					}

					if (addRes.Status === true) {
						console.log(`Added task '${task.taskName}' -> trigger '${job.triggerName}':`, addRes.Status);
					}
				} catch (err) {
					console.error(`Error adding task '${task.taskName}' to '${job.triggerName}':`, err);
					continue;
				}
			}
		}
	} catch (error) {
		console.error('Error creating jobs from list:', error);
		throw error;
	}
}
