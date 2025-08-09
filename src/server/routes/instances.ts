import { InstanceSearchFilter, ExtendedInstance } from './../../types/ampTypes';
import express from 'express';
import { getJson } from '../../utils/redisHelpers';
import redis from '../../loaders/database/redisLoader';
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
	if (!redis.isOpen) return res.status(503).json({ error: 'An error occurred while fetching data.' });
	const instances = (await getJson(redis, 'instances:all')) as ExtendedInstance[];
	const stateFilter = req.query.filter as InstanceSearchFilter;
	let filteredInstances = instances.flat() || [];
	filteredInstances = sortInstances(filteredInstances, stateFilter);
	return res.json(Array.isArray(filteredInstances) && filteredInstances.length === 1 ? filteredInstances[0] : filteredInstances);
});

// Get a specific instance by ID
router.get('/data/instances/:instanceId', async (req, res) => {
	if (!redis.isOpen) return res.status(503).json({ error: 'An error occurred while fetching data.' });
	const instance = await getJson(redis, `instance:${req.params.instanceId}`);
	if (!instance) {
		return res.status(404).json({ error: 'Instance not found' });
	}
	return res.json(instance);
});

function sortInstances(instances: any[], filter: InstanceSearchFilter) {
	if (filter === 'running') {
		return instances.filter((instance) => instance.Running === true);
	} else if (filter === 'not_hidden') {
		return instances.filter((instance) => instance.WelcomeMessage !== 'hidden');
	}
	return instances;
}

export default router;
