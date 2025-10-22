// Interface for modpack information returned by fetchModpackInformation
export interface CurseforgeModpackInfo {
	id: number;
	name: string;
	slug: string;
	summary: string;
	downloadCount: number;
	links?: {
		websiteUrl?: string;
		wikiUrl?: string;
		issuesUrl?: string;
		sourceUrl?: string;
	};
	logoUrl?: string;
	authors?: string[];
	mainFile: fileFormat;
}

interface fileFormat {
	id: number;
	gameId: number;
	modId: number;
	isAvailable: boolean;
	displayName: string;
	fileName: string;
	releaseType: number;
	fileStatus: number;
	hashes: { value: string; algo: number }[];
	fileDate: string;
	fileLength: number;
	downloadCount: number;
	fileSizeOnDisk: number;
	downloadUrl: string;
	gameVersions: string[];
	sortableGameVersions: any[];
	dependencies: any[];
	alternateFileId: number;
	isServerPack: boolean;
	serverPackFileId: number;
	fileFingerprint: number;
	modules: any[];
}

// Interface for mod information returned by fetchModInformation
export interface CurseforgeModInfo {
	id: number;
	name: string;
	summary: string;
	websiteUrl?: string;
	logoUrl?: string;
	slug: string;
	authors?: string[];
	latestFiles?: any[];
}
