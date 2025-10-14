export interface playerSchema {
	isPlaying: boolean;
	Username: string;
	userId: string | '';
	lastJoin: number;
	lastSeen: number;
	firstSeen?: number;
	totalPlaytimeMs: number | 0;
}
