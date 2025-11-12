export interface SanitizedInstance {
	InstanceID: string;
	TargetID: string;
	InstanceName: string;
	FriendlyName: string;
	WelcomeMessage: string;
	Description: string;
	ServerIcon: string;
	AppState: string;
	Module: string;
	Running: boolean;
	Suspended: boolean;
	isChatlinked: boolean;
	ServerModpack: { Name: string; URL: string } | undefined;
	NextRestart: { nextrunMs: number; nextRunDate: Date } | null;
	NextBackup: { nextrunMs: number; nextRunDate: Date } | null;
	Schedule?: { [key: string]: any } | null;
	Gamerules?: { [key: string]: SleepGamerule } | null;
	ConnectionInfo: ConnectionInfo;
	Metrics: { [key: string]: Metric };
	MetricsHistory: MetricSimple;
}

export interface ConnectionInfo {
	Port: number;
}

export interface SleepGamerule {
	sleepPercentage: number;
	requiredToSleep: number;
}

export interface Metric {
	RawValue: number;
	MaxValue: number;
	Percent: number;
	Units: string;
	Color: string | null;
	Color2: string | null;
	Color3: string | null;
	ShortName: string | null;
	PlayerList?: PlayerList[];
}

export interface MetricSimple {
	CPU: number[];
	Memory: number[];
	TPS: number[];
}

export type PlayerList = {
	UserID: string;
	Username: string;
	AvatarURL?: string;
};
