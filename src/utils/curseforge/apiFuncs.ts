import { CurseforgeModInfo, CurseforgeModpackInfo } from '../../types/curseforge/apiTypes';

// Game selections for CurseForge API
type gameSelections = 'Minecraft';

/**
 * Fetches modpack information (including image URL) from CurseForge API given a modpack URL.
 * @param modpackUrl The CurseForge modpack URL (e.g., https://www.curseforge.com/minecraft/modpacks/craftoria)
 */
export async function fetchModpackInformation(modpackUrl: string, game: gameSelections) {
	const apiKey = getApiKey();

	// Extract slug from URL
	const match = modpackUrl.match(/\/modpacks\/([^/?#]+)/);
	if (!match) throw new Error('Invalid CurseForge modpack URL');
	const slug = match[1];

	// Search for mod ID using the slug
	const searchUrl = `https://api.curseforge.com/v1/mods/search?gameId=${gameIds[game]}&classId=4471&slug=${encodeURIComponent(slug)}`;
	const searchRes = await fetch(searchUrl, {
		headers: {
			'x-api-key': apiKey,
			Accept: 'application/json',
		},
	});
	if (!searchRes.ok) {
		throw new Error(`Failed to search for modpack (status ${searchRes.status})`);
	}
	const searchData = await searchRes.json();
	if (!searchData.data || !searchData.data.length) throw new Error('Modpack not found');
	const mod = searchData.data[0];
	const modInfo = await fetchModDetails(mod.id, apiKey);

	const result: CurseforgeModpackInfo = {
		id: modInfo.id,
		name: modInfo.name,
		slug: modInfo.slug,
		summary: modInfo.summary,
		downloadCount: modInfo.downloadCount,
		links: modInfo.links,
		logoUrl: modInfo.logo?.url,
		authors: modInfo.authors?.map((a: any) => a.name),
		mainFile: modInfo.latestFiles.find((file: any) => file.id === modInfo.mainFileId),
	};

	return result;
}

/**
 * Fetches mod information (including image URL) from CurseForge API given a mod URL.
 * @param modUrl The CurseForge mod URL (e.g., https://www.curseforge.com/minecraft/mc-mods/jei)
 * @param game The game name (e.g., 'Minecraft')
 */
export async function fetchModInformation(modUrl: string, game: gameSelections): Promise<CurseforgeModInfo> {
	const apiKey = getApiKey();

	// Extract slug from URL
	const match = modUrl.match(/\/mc-mods\/([^/?#]+)/);
	if (!match) throw new Error('Invalid CurseForge mod URL');
	const slug = match[1];

	// Search for mod ID using the slug
	const searchUrl = `https://api.curseforge.com/v1/mods/search?gameId=${gameIds[game]}&classId=6&slug=${encodeURIComponent(slug)}`;
	const searchRes = await fetch(searchUrl, {
		headers: {
			'x-api-key': apiKey,
			Accept: 'application/json',
		},
	});
	if (!searchRes.ok) {
		throw new Error(`Failed to search for mod (status ${searchRes.status})`);
	}
	const searchData = await searchRes.json();
	if (!searchData.data || !searchData.data.length) throw new Error('Mod not found');
	const mod = searchData.data[0];

	const modInfo = await fetchModDetails(mod.id, apiKey);

	const result: CurseforgeModInfo = {
		id: modInfo.id,
		name: modInfo.name,
		summary: modInfo.summary,
		websiteUrl: modInfo.links?.websiteUrl,
		logoUrl: modInfo.logo?.url,
		slug: modInfo.slug,
		authors: modInfo.authors?.map((a: any) => a.name),
		latestFiles: modInfo.latestFiles,
	};

	return result;
}

function getApiKey(): string {
	const apiKey = process.env.CURSEFORGE_API_KEY;
	if (!apiKey) throw new Error('CurseForge API key is not configured.');
	return apiKey;
}

async function fetchModDetails(modId: number, apiKey: string) {
	const modDetailsUrl = `https://api.curseforge.com/v1/mods/${modId}`;
	const modRes = await fetch(modDetailsUrl, {
		headers: {
			'x-api-key': apiKey,
			Accept: 'application/json',
		},
	});
	if (!modRes.ok) throw new Error('Failed to fetch mod details');
	const modData = await modRes.json();
	return modData.data;
}

const gameIds: { [key: string]: number } = {
	Minecraft: 432,
};
