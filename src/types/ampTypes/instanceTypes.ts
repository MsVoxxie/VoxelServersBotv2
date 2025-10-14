export interface SanitizedInstance {
	InstanceID: string;
	TargetID: string;
	InstanceName: string;
	FriendlyName: string;
	WelcomeMessage: string;
	Description: string;
	ServerModpack: { Name: string; URL: string } | undefined;
	ServerIcon: string;
	Module: string;
	Running: boolean;
	AppState: string;
	Suspended: boolean;
	Metrics: { [key: string]: Metric };
	Schedule?: { [key: string]: any } | null;
	NextRestart: { nextrunMs: number; nextRunDate: Date } | null;
	NextBackup: { nextrunMs: number; nextRunDate: Date } | null;
	ConnectionInfo: ConnectionInfo;
	Gamerules?: { [key: string]: SleepGamerule } | null;
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

export type PlayerList = {
	UserID: string;
	Username: string;
	AvatarURL?: string;
};
