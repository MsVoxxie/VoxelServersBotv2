export interface NetworkTestResult {
	isAlive: boolean;
	lastOffline: number | undefined;
	lastOnline: number | undefined;
	latencyMs: number;
	latencyAvgMs: number;
	historyLength: number;
}
