import express from 'express';
import cors from 'cors';
import { join } from 'path';
import Logger from '../../utils/logger';
import createRouter from '../../server/router';

const Port = process.env.API_PORT;
const srv = express();

export default async (client: any) => {
	srv.set('trust proxy', process.env.API_PROXY);
	srv.use(cors({ origin: [/^https:\/\/vs\.voxxie\.me$/, /^http:\/\/localhost(:\d+)?$/] }));
	srv.use(express.json());
	srv.use(express.urlencoded({ extended: true }));
	srv.use('/v2/static', express.static(join(__dirname, '../../../src/server/public')));
	srv.set('discordClient', client);

	const router = createRouter;
	srv.use('/v2', router);

	// Return JSON for any unmatched route (avoid HTML 404 pages)
	srv.use((req, res) => {
		res.status(404).json({ error: 'Not Found' });
	});

	// Global error handler - return JSON instead of HTML error pages
	srv.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
		Logger.error('API', err);
		if (res.headersSent) return next(err);
		res.status(500).json({ error: 'Internal Server Error' });
	});

	try {
		srv.listen(Port, () => {
			Logger.success('API', `API running on port ${Port}`);
		});
	} catch (error) {
		Logger.error('API', `Error starting API server: ${error}`);
		return;
	}
};
