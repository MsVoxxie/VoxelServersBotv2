import { RedisKeys } from '../../types/redisKeys/keys';
import redis from '../../loaders/database/redisLoader';
import { getJson } from '../../utils/redisHelpers';
import express from 'express';
const router = express.Router();

export const routeDescriptions = [
	{
		patch: '/data/playtime/:instance/:username',
		method: 'GET',
		description: 'Returns the total playtime for a specific player by username in a given instance.',
	},
];

// Unified endpoint for player avatar
router.get('/data/playtime/:instance/:username', async (req, res) => {
	const { instance, username } = req.params;

	await getJson(redis, RedisKeys.playerData(instance, username))
		.then((playerData) => {
			if (!playerData) {
				return res.status(404).json({ error: 'Player data not found' });
			}
			return res.json(playerData);
		})
		.catch((error) => {
			return res.status(500).json({ error: 'An error occurred while fetching player data.' });
		});
});

export default router;
