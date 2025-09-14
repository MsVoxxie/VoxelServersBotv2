export type TellrawColor =
	| 'black'
	| 'dark_blue'
	| 'dark_green'
	| 'dark_aqua'
	| 'dark_red'
	| 'dark_purple'
	| 'gold'
	| 'gray'
	| 'dark_gray'
	| 'blue'
	| 'green'
	| 'aqua'
	| 'red'
	| 'light_purple'
	| 'yellow'
	| 'white'
	| `#${string}`;

export type TellrawClickAction = 'run_command' | 'suggest_command' | 'open_url' | 'change_page' | 'copy_to_clipboard';
export type TellrawHoverAction = 'show_text' | 'show_item' | 'show_entity';

export interface TellrawClick {
	action: TellrawClickAction;
	value: string;
}
export interface TellrawHover {
	action: TellrawHoverAction;
	contents: string | TellrawText | TellrawText[];
}

export interface TellrawText {
	// one of text or translate (simple set)
	text?: string;
	translate?: string;
	color?: TellrawColor;
	bold?: boolean;
	italic?: boolean;
	underlined?: boolean;
	strikethrough?: boolean;
	obfuscated?: boolean;
	insertion?: string;
	clickEvent?: TellrawClick;
	hoverEvent?: TellrawHover;
	extra?: TellrawText[];
}
