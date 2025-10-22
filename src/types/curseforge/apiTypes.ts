// Interface for modpack information returned by fetchModpackInformation
export interface CurseforgeModpackInfo {
	id: number;
	name: string;
	summary: string;
	websiteUrl?: string;
	logoUrl?: string;
	slug: string;
	authors?: string[];
	latestFiles?: any[];
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
