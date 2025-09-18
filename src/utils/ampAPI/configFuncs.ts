import { SchedulerJobs, ModuleTypeMap, TaskToAdd, configType } from '../../types/ampTypes/ampTypes';
import { instanceLogin } from './mainFuncs';
import logger from '../logger';

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
	try {
		const API = await instanceLogin(instanceID, moduleName as keyof ModuleTypeMap);
		if (!API) {
			logger.error('GetConfigs', 'No API instance found');
			return { success: false, error: 'Unable to connect to instance.', data: null };
		}
		const config = await API.Core.GetConfig(configKey);
		return { success: true, error: null, key: config };
	} catch (error) {
		logger.error('GetConfigs', 'Error retrieving instance configs');
		return { success: false, error: 'Error retrieving instance configs', data: null };
	}
}
