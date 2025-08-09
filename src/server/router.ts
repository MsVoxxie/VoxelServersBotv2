import express from 'express';
import path from 'path';
import getAllFiles from '../utils/fileFuncs';
import logger from '../utils/logger';

import Table from 'cli-table3';
const routerTable = new Table({
	head: ['Router Route', 'Methods', 'Load Status'],
	style: { head: ['cyan'] },
});

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
			// Collect all methods from all routes in the file
			const methodsSet = new Set<string>();
			if (Array.isArray(maybeRouter.stack)) {
				maybeRouter.stack.forEach((layer: any) => {
					if (layer.route && layer.route.methods) {
						Object.keys(layer.route.methods).forEach((method) => {
							methodsSet.add(method.toUpperCase());
						});
					}
				});
			}
			const methods = Array.from(methodsSet).join('/');
			routerTable.push([fileName, methods || 'None', '✔ » Loaded']);
		} else {
			routerTable.push([fileName, '✕ » Invalid Export', 'Failed']);
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		logger.error('Router', `Error loading route ${fileName}: ${errorMsg}`);
	}
}
console.log(routerTable.toString());

router.get('/list', (req, res) => {
	const routeMap: Record<string, { methods: Set<string>; descriptions: Record<string, string> }> = {};
	for (const filePath of routeFiles) {
		try {
			const mod = require(filePath);
			const descriptions = mod.routeDescriptions || [];
			descriptions.forEach((desc: any) => {
				if (!routeMap[desc.path]) {
					routeMap[desc.path] = { methods: new Set(), descriptions: {} };
				}
				routeMap[desc.path].methods.add(desc.method);
				routeMap[desc.path].descriptions[desc.method] = desc.description;
			});
		} catch {
			null;
		}
	}
	const collectRoutes = (stack: any[]) => {
		stack.forEach((layer: any) => {
			if (layer.route) {
				const path = layer.route.path;
				const methods = Object.keys(layer.route.methods);
				if (!routeMap[path]) routeMap[path] = { methods: new Set(), descriptions: {} };
				methods.forEach((method) => routeMap[path].methods.add(method.toUpperCase()));
			} else if (layer.name === 'router' && layer.handle.stack) {
				collectRoutes(layer.handle.stack);
			}
		});
	};
	collectRoutes(router.stack);

	const routes = Object.entries(routeMap).map(([path, data]) => ({
		path,
		methods: Array.from(data.methods),
		descriptions: data.descriptions,
	}));

	res.json(routes);
});

export default router;
