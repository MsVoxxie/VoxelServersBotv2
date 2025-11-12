import express from 'express';
import { getMCHead, getSteamAvatar } from '../../utils/playerHeads';
const router = express.Router();

export const routeDescriptions = [
	{
		patch: '/data/avatar/:id',
		method: 'GET',
		description: 'Returns the player avatar image for a specific Minecraft username or Steam64 ID.',
	},
];

// Unified endpoint for player avatar
router.get('/data/avatar/:id', async (req, res) => {
	const { id } = req.params;

	let filePath;
	if (/^[a-zA-Z0-9_]{3,16}$/.test(id)) {
		// If format is minecraft or id looks like a Minecraft username
		filePath = await getMCHead(id);
		if (!filePath) return res.status(404).json({ error: 'Player head not found' });
		return res.sendFile(filePath);
	} else if (/^[0-9]{17}$/.test(id) || id.startsWith('STEAM_')) {
		// If format is steam or id looks like a Steam64 or legacy SteamID
		filePath = await getSteamAvatar(id);
		if (!filePath) return res.status(404).json({ error: 'Steam avatar not found' });
		return res.sendFile(filePath);
	} else {
		return res.status(400).json({ error: 'Invalid format or ID' });
	}
});

export default router;
