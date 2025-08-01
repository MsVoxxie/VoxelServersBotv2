import express from 'express';
import { getJson } from '../../utils/redisHelpers';
import redis from '../../loaders/database/redisLoader';
const router = express.Router();

// Get all instances
router.get('/data/instances', async (req, res) => {
	if (!redis.isOpen) return res.status(503).json({ error: 'An error occurred while fetching data.' });
	const instances = await getJson(redis, 'instances:all');
	return res.json(Array.isArray(instances) && instances.length === 1 ? instances[0] : instances);
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

export default router;
