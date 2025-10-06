export interface playerSchema {
	Username: string;
	userId: string | '';
	lastJoin: number;
	lastSeen: number;
	firstSeen?: number;
	totalPlaytimeMs?: number;
}
