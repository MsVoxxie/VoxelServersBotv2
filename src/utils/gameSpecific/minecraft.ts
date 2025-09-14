export function calculateSleepingPercentage(onlinePlayers: number, maxPlayers: number) {
	if (maxPlayers <= 0 || onlinePlayers <= 0) return { sleepPercentage: 50, requiredToSleep: 0 };
	if (onlinePlayers <= 1) return { sleepPercentage: 50, requiredToSleep: 1 };

	const rawPercentage = 50 * (1 - Math.pow(onlinePlayers / maxPlayers, 2));
	const cappedPercentage = Math.min(50, Math.max(25, rawPercentage));
	const roundedPercentage = Math.round(cappedPercentage / 5) * 5;
	const required = Math.max(1, Math.ceil((roundedPercentage / 100) * onlinePlayers));

	return { sleepPercentage: roundedPercentage, requiredToSleep: required };
}
