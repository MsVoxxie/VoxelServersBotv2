import express from 'express';
import { getMCHead, getSteamAvatar } from '../../utils/playerHeads';
const router = express.Router();

export const routeDescriptions = [
	{
		path: '/data/mcheads/:username',
		method: 'GET',
		description: 'Returns the player head image for a specific username.',
	},
	{
		path: '/data/steamavatar/:steam64',
		method: 'GET',
		description: 'Returns the Steam avatar image for a specific Steam64 ID.',
	},
];

// Get minecraft player head
router.get('/data/mchead/:username', async (req, res) => {
	const username = req.params.username;
	const head = await getMCHead(username);
	if (!head) {
		return res.status(404).json({ error: 'Player head not found' });
	}
	return res.sendFile(head);
});

// Get steam avatar
router.get('/data/steamavatar/:steam64', async (req, res) => {
	const steam64 = req.params.steam64;
	const avatar = await getSteamAvatar(steam64);
	if (!avatar) {
		return res.status(404).json({ error: 'Steam avatar not found' });
	}
	return res.sendFile(avatar);
});

export default router;
