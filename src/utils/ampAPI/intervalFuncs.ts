import { IntervalLookupType, ModuleTypeMap, TimeIntervalData } from '../../types/ampTypes/ampTypes';
import { RawTimeIntervalData } from './../../types/ampTypes/ampTypes';
import { CronExpressionParser } from 'cron-parser';
import { loginAndGetSchedule } from './taskFuncs';
import logger from '../logger';
import redis from '../../loaders/database/redisLoader';
import { getJson, mergeJson } from '../redisHelpers';

export async function getIntervalTrigger(instanceId: string, moduleName: string, lookupType: IntervalLookupType) {
	try {
		// check redis cache first (shared short-term cache)
		try {
			const redisKey = `instanceCache:${instanceId}`;
			const cached = await getJson<any>(redis, redisKey).catch(() => null);
			if (cached && Array.isArray(cached.triggers) && cached.triggers.length) {
				// If lookupType is specific, filter cached triggers accordingly
				if (lookupType === 'Both') return cached.triggers;
				return cached.triggers.filter((t: any) => t.type === lookupType);
			}
		} catch (err) {
			// ignore cache errors
		}
		const { API, scheduleData } = await loginAndGetSchedule(instanceId, moduleName as keyof ModuleTypeMap);
		if (!API) return logger.error('getIntervalTrigger', `Failed to login to instance ID ${instanceId} for interval lookup.`);

		const populatedTriggers = await scheduleData.PopulatedTriggers.filter((trigger: any) => trigger.Type === 'TimeIntervalTrigger');

		let triggersToProcess: any[] = [];
		if (lookupType === 'Both') {
			triggersToProcess = populatedTriggers.filter((trigger: any) => trigger.Description.includes('Restart') || trigger.Description.includes('Backup'));
		} else {
			const filteredTrigger = populatedTriggers.find((trigger: any) => trigger.Description.includes(lookupType));
			if (filteredTrigger) triggersToProcess = [filteredTrigger];
		}

		if (triggersToProcess.length === 0) return [];

		const results = await Promise.all(
			triggersToProcess.map(async (trigger: any) => {
				const fetchedTrigger = await API.Core.GetTimeIntervalTrigger(trigger.Id);
				const formattedData: RawTimeIntervalData = {
					DaysOfMonth: fetchedTrigger.MatchDaysOfMonth,
					Months: fetchedTrigger.MatchMonths,
					Days: fetchedTrigger.MatchDays,
					Hours: fetchedTrigger.MatchHours,
					Minutes: fetchedTrigger.MatchMinutes,
					Type: fetchedTrigger.Description,
					Id: fetchedTrigger.Id,
				};
				const cronFormat: string = ampIntervalToCron(formattedData);
				const parsed = parseCronToUsable(cronFormat);
				// Determine type
				let type: 'Backup' | 'Restart' = 'Restart';
				if (trigger.Description.includes('Backup')) type = 'Backup';
				else if (trigger.Description.includes('Restart')) type = 'Restart';
				return { type, data: { ...parsed } };
			})
		);

		// cache triggers for 30s
		try {
			const redisKey = `instanceCache:${instanceId}`;
			await mergeJson<any>(redis, redisKey, { triggers: results }, '.', 30).catch(() => null);
		} catch (err) {
			// ignore cache write errors
		}

		return results;
	} catch (error) {
		logger.error('getIntervalTrigger', `Error fetching interval trigger for instance ID ${instanceId}: ${error instanceof Error ? error.message : String(error)}`);
		return null;
	}
}

export function ampIntervalToCron(data: RawTimeIntervalData): string {
	const minutes = data.Minutes.length ? data.Minutes.join(',') : '*';
	const hours = data.Hours.length ? data.Hours.join(',') : '*';
	const dom = data.DaysOfMonth.length ? data.DaysOfMonth.join(',') : '*';
	const months = data.Months.length ? data.Months.map((m) => m + 1).join(',') : '*';
	const dow = data.Days.length ? data.Days.map((d) => (d === 0 ? 7 : d)).join(',') : '*';

	return `${minutes} ${hours} ${dom} ${months} ${dow}`;
}

function parseCronToUsable(cronString: string) {
	if (!cronString) return;
	const parsed = CronExpressionParser.parse(cronString);
	const toDate: Date = parsed.next().toDate();
	const toMs: number = toDate.getTime() - Date.now();
	return { nextrunMs: toMs, nextRunDate: toDate };
}
