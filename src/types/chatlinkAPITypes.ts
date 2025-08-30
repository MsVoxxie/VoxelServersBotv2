// Common typed shapes for the ChatLink endpoint

export interface ChatlinkBase {
	InstanceId: string;
	EventId?: string;
	Username?: string;
	UserId?: string;
	Message?: string;
	[key: string]: unknown;
}

export interface PlayerEvent extends ChatlinkBase {
	Username: string;
	UserId?: string;
}

export interface ChatMessageEvent extends PlayerEvent {
	Message: string;
}

export interface KillEvent extends ChatlinkBase {
	Victim: string;
	Attacker?: string;
	Method?: string;
}

export interface AdvancementEvent extends ChatlinkBase {
	Username: string;
	Advancement: string;
}

export interface StateChangeEvent extends ChatlinkBase {
	State: string;
}

export interface BackupEvent extends ChatlinkBase {}

export interface LagEvent extends ChatlinkBase {
	TicksSkipped?: number | string;
	MillisecondsBehind?: number | string;
}

export type ChatlinkWebhookPayload = PlayerEvent | ChatMessageEvent | KillEvent | AdvancementEvent | StateChangeEvent | BackupEvent | LagEvent | ChatlinkBase;

export function isValidChatlinkPayload(body: unknown): body is ChatlinkWebhookPayload {
	if (!body || typeof body !== 'object') return false;
	const b = body as Record<string, unknown>;
	return typeof b.InstanceId === 'string' && b.InstanceId.length > 0;
}
