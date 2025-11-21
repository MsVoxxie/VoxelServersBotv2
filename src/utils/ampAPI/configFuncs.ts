import { SchedulerJobs, ModuleTypeMap, TaskToAdd, configType } from '../../types/ampTypes/ampTypes';
import { instanceLogin } from './apiFuncs';
import logger from '../logger';
import redis from '../../loaders/database/redisLoader';
import { getJson, mergeJson } from '../redisHelpers';

export async function setInstanceConfigs(instanceID: string, moduleName: string, configs: configType) {
	try {
		const API = await instanceLogin(instanceID, moduleName as keyof ModuleTypeMap);
		if (!API) {
			logger.error('UpdateConfigs', 'No API instance found');
			return { success: false, error: 'Unable to connect to instance.', data: null };
		}
		await API.Core.SetConfigs(configs);
	} catch (error) {
		logger.error('UpdateConfigs', 'Error updating instance configs');
		return { success: false, error: 'Error updating instance configs', data: null };
	}
}

export async function setInstanceConfig(instanceID: string, moduleName: string, config: configType) {
	try {
		const API = await instanceLogin(instanceID, moduleName as keyof ModuleTypeMap);
		if (!API) {
			logger.error('UpdateConfigs', 'No API instance found');
			return { success: false, error: 'Unable to connect to instance.', data: null };
		}
		await API.Core.SetConfig(config.key, config.value);
	} catch (error) {
		logger.error('UpdateConfigs', 'Error updating instance configs');
		return { success: false, error: 'Error updating instance configs', data: null };
	}
}

export async function getInstanceConfigs(instanceID: string, moduleName: string, configKeys: string[]) {
	try {
		const API = await instanceLogin(instanceID, moduleName as keyof ModuleTypeMap);
		if (!API) {
			logger.error('GetConfigs', 'No API instance found');
			return { success: false, error: 'Unable to connect to instance.', data: null };
		}
		const configs = await API.Core.GetConfigs(configKeys);
		return { success: true, error: null, keys: configs };
	} catch (error) {
		logger.error('GetConfigs', 'Error retrieving instance configs');
		return { success: false, error: 'Error retrieving instance configs', data: null };
	}
}

export async function getInstanceConfig(instanceID: string, moduleName: string, configKey: string) {
	// Short-circuit cache for schedule offset specifically
	try {
		if (configKey === 'Core.AMP.ScheduleOffsetSeconds') {
			const redisKey = `instanceCache:${instanceID}`;
			const cached = await getJson<any>(redis, redisKey).catch(() => null);
			if (cached && cached.scheduleOffset) {
				return { success: true, error: null, key: cached.scheduleOffset };
			}
		}
	} catch (err) {
		// ignore cache errors
	}
	try {
		const API = await instanceLogin(instanceID, moduleName as keyof ModuleTypeMap);
		if (!API) {
			logger.error('GetConfigs', 'No API instance found');
			return { success: false, error: 'Unable to connect to instance.', data: null };
		}
		const config = await API.Core.GetConfig(configKey);
		// cache schedule offset if requested
		try {
			if (configKey === 'Core.AMP.ScheduleOffsetSeconds') {
				const redisKey = `instanceCache:${instanceID}`;
				await mergeJson<any>(redis, redisKey, { scheduleOffset: config }, '.', 30).catch(() => null);
			}
		} catch (err) {
			// ignore cache write errors
		}
		return { success: true, error: null, key: config };
	} catch (error) {
		logger.error('GetConfigs', 'Error retrieving instance configs');
		return { success: false, error: 'Error retrieving instance configs', data: null };
	}
}
