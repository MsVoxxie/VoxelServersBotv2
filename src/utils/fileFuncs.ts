import { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { dirname, join } from 'path';

export const listPaths = (directory: string, foldersOnly = false) => {
	let fileNames: string[] = [];
	const files = readdirSync(directory, { withFileTypes: true });
	for (const file of files) {
		const filePath = join(directory, file.name);
		if (foldersOnly) {
			if (file.isDirectory()) fileNames.push(filePath);
		} else {
			if (file.isFile()) fileNames.push(filePath);
		}
	}
	return fileNames;
};

export default listPaths;

function ensureDirFor(filePath: string) {
	const dir = dirname(filePath);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function appendJsonArrayUnique(filePath: string, item: unknown): boolean {
	ensureDirFor(filePath);

	let arr: unknown[] = [];
	if (existsSync(filePath)) {
		try {
			const raw = readFileSync(filePath, 'utf8');
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) arr = parsed;
			else {
				return false;
			}
		} catch {
			arr = [];
		}
	}

	const serialized = typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean' ? String(item) : JSON.stringify(item);
	const exists = arr.some((a) => {
		if (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean') return String(a) === serialized;
		return JSON.stringify(a) === serialized;
	});
	if (exists) return false;

	arr.push(item);
	writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');
	return true;
}

export function appendLineUnique(filePath: string, line: string, unique = true): boolean {
	ensureDirFor(filePath);

	let existing = '';
	if (existsSync(filePath)) {
		try {
			existing = readFileSync(filePath, 'utf8');
		} catch {
			existing = '';
		}
	}

	if (unique) {
		const lines = existing.split(/\r?\n/).filter(Boolean);
		if (lines.includes(line)) return false;
	}

	const toWrite = (existing && !existing.endsWith('\n') ? '\n' : '') + line + '\n';
	appendFileSync(filePath, toWrite, 'utf8');
	return true;
}

export function addToPath(targetPath: string, payload: unknown, opts?: { unique?: boolean; forceJsonArray?: boolean }): boolean {
	const unique = opts?.unique ?? true;
	const ext = targetPath.split('.').pop()?.toLowerCase() ?? '';
	if (ext === 'json' || opts?.forceJsonArray) {
		return appendJsonArrayUnique(targetPath, payload);
	}
	return appendLineUnique(targetPath, String(payload), unique);
}
