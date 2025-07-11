import { getAllInstances, getInstanceById } from '../../utils/ampAPI/main';
import express from 'express';
const router = express.Router();

// Get all instances
router.get('/data/instances', async (req, res) => {
	const instances = await getAllInstances({ fetch: 'not_hidden' });
	return res.json(instances);
});

// Get a specific instance by ID
router.get('/data/instances/:instanceId', async (req, res) => {
	const instance = await getInstanceById(req.params.instanceId);
	if (!instance) {
		return res.status(404).json({ error: 'Instance not found' });
	}
	return res.json(instance);
});

export default router;
