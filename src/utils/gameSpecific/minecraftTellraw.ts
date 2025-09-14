import { TellrawColor, TellrawText } from '../../types/gameSpecific/minecraftTellrawTypes';

export function tellrawJson(parts: TellrawText | TellrawText[]): TellrawText | TellrawText[] {
	return parts;
}

// Example: tellraw @a [{"text":"Hello","color":"green"},{"text":" world","color":"yellow"}]
export function tellRawBuilder(parts: TellrawText | TellrawText[], target = '@a'): string {
	const payload = Array.isArray(parts) ? parts : [parts];
	const spacedParts: TellrawText[] = [];
	for (let i = 0; i < payload.length; i++) {
		spacedParts.push(payload[i]);
		if (i < payload.length - 1) spacedParts.push({ text: ' ' });
	}

	return `tellraw ${target} ${JSON.stringify(spacedParts)}`;
}

// Example: part('Voxxie', 'gold', { bold: true });
export function part(text: string, color?: TellrawColor, opts?: Partial<Omit<TellrawText, 'text' | 'translate' | 'extra'> & { extra?: TellrawText[] }>): TellrawText {
	return {
		text,
		...(color ? { color } : {}),
		...opts,
	};
}
