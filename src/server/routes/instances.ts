import { SanitizedInstance } from '../../types/ampTypes/instanceTypes';
import { InstanceSearchFilter } from '../../types/ampTypes/ampTypes';
import express from 'express';
import { getJson, getKeys } from '../../utils/redisHelpers';
import redis from '../../loaders/database/redisLoader';
import logger from '../../utils/logger';
const router = express.Router();

export const routeDescriptions = [
	{
		path: '/data/instances',
		method: 'GET',
		description: 'Returns all instances as JSON.',
	},
	{
		path: '/data/instances/:instanceId',
		method: 'GET',
		description: 'Returns a specific instance by ID.',
	},
];

// Get all instances
router.get('/data/instances', async (req, res) => {
	try {
		if (!redis.isOpen) return res.status(503).json({ error: 'An error occurred while fetching data.' });
		const instances = (await getKeys(redis, 'instance:*')) as SanitizedInstance[];
		const stateFilter = req.query.filter as InstanceSearchFilter;
		let filteredInstances = instances.flat() || [];
		filteredInstances = sortInstances(filteredInstances, stateFilter);
		return res.json(Array.isArray(filteredInstances) && filteredInstances.length === 1 ? filteredInstances[0] : filteredInstances);
	} catch (err) {
		logger.error('instances route', err);
		return res.status(500).json({ error: 'An error occurred while fetching instances.' });
	}
});

// Get a specific instance by ID
router.get('/data/instances/:instanceId', async (req, res) => {
	try {
		if (!redis.isOpen) return res.status(503).json({ error: 'An error occurred while fetching data.' });
		const instance = await getJson(redis, `instance:${req.params.instanceId}`);
		if (!instance) {
			return res.status(404).json({ error: 'Instance not found' });
		}
		return res.json(instance);
	} catch (err) {
		logger.error('instances route', err);
		return res.status(500).json({ error: 'An error occurred while fetching the instance.' });
	}
});

function sortInstances(instances: any[], filter: InstanceSearchFilter) {
	// Initial sort
	instances.sort((a, b) => {
		// Running Minecraft first
		if (a.Running && a.Module === 'Minecraft' && (!b.Running || b.Module !== 'Minecraft')) return -1;
		if (b.Running && b.Module === 'Minecraft' && (!a.Running || a.Module !== 'Minecraft')) return 1;

		// Other running instances next
		if (a.Running && !b.Running) return -1;
		if (!a.Running && b.Running) return 1;

		return a.FriendlyName.localeCompare(b.FriendlyName);
	});

	// Apply filter
	switch (filter) {
		case 'running_and_not_hidden':
			return instances.filter((instance) => instance.Running === true && instance.WelcomeMessage !== 'hidden');
		case 'running':
			return instances.filter((instance) => instance.Running === true);
		case 'not_hidden':
			return instances.filter((instance) => instance.WelcomeMessage !== 'hidden');
	}
	return instances;
}

export default router;
