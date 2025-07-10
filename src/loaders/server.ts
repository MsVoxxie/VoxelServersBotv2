import express from 'express';
import cors from 'cors';
import { join } from 'path';
import Logger from '../utils/logger';
import createRouter from '../server/router';

const Port = process.env.API_PORT;
const srv = express();

export default async (client: any) => {
	srv.set('trust proxy', process.env.API_PROXY);
	srv.use(cors({ origin: [/^https:\/\/vs\.voxxie\.me$/, /^http:\/\/localhost(:\d+)?$/] }));
	srv.use(express.json());
	srv.use('/v2/static', express.static(join(__dirname, '../server/public')));
	
	// Wait for router to be created with all routes loaded
	const router = await createRouter;
	srv.use('/v2', router);
	
	try {
		srv.listen(Port, () => {
			Logger.success('API', `API running on port ${Port}`);
		});
	} catch (error) {
		Logger.error('API', `Error starting API server: ${error}`);
		return;
	}
};
