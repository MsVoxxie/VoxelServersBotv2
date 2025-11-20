import express from 'express';
import path from 'path';
import { getMCHead, getSteamAvatar } from '../../utils/playerHeads';

const router = express.Router();

export const routeDescriptions = [
	{
		patch: '/data/avatar/:id',
		method: 'GET',
		description: 'Returns the player avatar image for a specific Minecraft username or Steam64 ID.',
	},
];

// Helper to normalize sendFile root + error handling
function sendAvatar(res: express.Response, filePath: string) {
	// `filePath` from getMCHead/getSteamAvatar is absolute, but using root
	// avoids issues in some environments.
	const rootDir = '/'; // absolute path is already in filePath
	res.sendFile(filePath, { root: rootDir }, (err) => {
		if (err) {
			// If we somehow fail here, send a generic 500
			if (!res.headersSent) {
				res.status(500).json({ error: 'Failed to serve avatar file' });
			}
		}
	});
}

// Unified endpoint for player avatar
router.get('/data/avatar/:id', async (req, res) => {
	const { id } = req.params;

	try {
		let filePath: string;

		if (/^[a-zA-Z0-9_]{3,16}$/.test(id) || /^[a-fA-F0-9]{32}$/.test(id.replace(/-/g, ''))) {
			console.log('[playerAvatars] Treating id as Minecraft:', id);
			filePath = await getMCHead(id);
			return sendAvatar(res, filePath);
		}

		if (/^[0-9]{17}$/.test(id) || id.startsWith('STEAM_')) {
			console.log('[playerAvatars] Treating id as Steam:', id);
			filePath = await getSteamAvatar(id);
			return sendAvatar(res, filePath);
		}

		return res.status(400).json({ error: 'Invalid format or ID' });
	} catch (err) {
		console.error('[playerAvatars] Unexpected error resolving avatar', err);
		return res.status(500).json({ error: 'Unexpected error resolving avatar' });
	}
});

export default router;
