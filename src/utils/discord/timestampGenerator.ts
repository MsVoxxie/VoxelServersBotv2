export function toDiscordTimestamp(d: Date, style: 'R' | 'f' | 'F' | 'd' | 'D' | 't' = 'R'): string {
	const sec = Math.floor(d.getTime() / 1000);
	return `<t:${sec}:${style}>`;
}
