import express from 'express';
const router = express.Router();

router.get('/data/:instanceId?', async (req, res) => {
	const instanceId = req.params.instanceId;
	if (!instanceId) {
		return res.status(400).json({ error: 'Instance ID is required' });
	}

	// Simulate fetching instance data
	const instanceData = {
		id: instanceId,
		name: `Instance ${instanceId}`,
		status: 'active',
		createdAt: new Date().toISOString(),
	};
	res.json(instanceData);
});

export default router;
