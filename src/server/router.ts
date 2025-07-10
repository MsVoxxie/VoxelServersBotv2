import express from 'express';
import path from 'path';
import getAllFiles from '../utils/fileFuncs';
import logger from '../utils/logger';

const router = express.Router();
const routesDir = path.join(__dirname, 'routes');
const routeFiles = getAllFiles(routesDir).filter((file) => file.endsWith('.js'));

for (const filePath of routeFiles) {
	const fileName = path.basename(filePath);
	try {
		const mod = require(filePath);
		const maybeRouter = mod.default || mod;
		if (maybeRouter && typeof maybeRouter === 'function') {
			router.use(maybeRouter);
		} else {
			logger.warn('Router', `Route file ${fileName} does not export a valid router.`);
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		logger.error('Router', `Error loading route ${fileName}: ${errorMsg}`);
	}
}
export default router;
