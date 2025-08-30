import express from 'express';
import redis from '../../loaders/database/redisLoader';
import { isValidChatlinkPayload } from '../../types/chatlinkAPITypes';
import { addToPath } from '../../utils/fileFuncs';
import path from 'path';
const router = express.Router();

export const routeDescriptions = [
	{
		path: '/server/chatlink',
		method: 'POST',
		description: 'Handles incoming chat link events.',
	},
];

router.post('/server/chatlink', async (req, res) => {
	const { body } = req;
	if (!isValidChatlinkPayload(body)) {
		console.log('Invalid payload:', body);
		return res.status(400).json({ error: 'Invalid payload' });
	}
	const formattedEvent = req.body.EventId.split('.')[2].replace(/^./, (c: any) => c.toLowerCase());

	// Create a list of events for sanity
	const jsonPath = path.resolve(process.cwd(), 'data', 'EventList.json');
	console.log('Saving formattedEvent to:', jsonPath);
	const saved = addToPath(jsonPath, formattedEvent);
	console.log('addToPath result:', saved);

	return res.status(200).json({ ok: true, event: formattedEvent, saved, path: jsonPath });
});

export default router;
