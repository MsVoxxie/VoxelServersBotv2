export type RedisKeys =
    | `playerdata:${string}:${string}`             // playerdata:<instanceId>:<playerUUID>
    | `usermanagement:${string}`                   // usermanagement:<instanceId>
    | `session:${string}`                          // session:<sessionId>
    | `instance:${string}`                         // instance:<instanceId>
    | `backupTimer:${string}`                      // backupTimer:<instanceId>
    | `serverStart:${string}`                      // serverStart:<instanceId>
    | `pendingInstanceCreate:${string}`            // pendingInstanceCreate:<instanceId>
    | `pendingInstanceDelete:${string}`            // pendingInstanceDelete:<instanceId>
    | `instanceCache:${string}`                    // instanceCache:<instanceId>
    | 'instanceSnapshot'                           // watchInstances snapshot
    | 'playerchoices'                              // cached player choices
    | 'instancesAll'                               // optional (currently unused)
	| 'server:networkCheck';                       // network check flag

// Key builders (type-safe)
export const RedisKeys = {
    playerData: (instanceId: string, playerUUID: string) => `playerdata:${instanceId}:${playerUUID}` as const,
    instance: (instanceId: string) => `instance:${instanceId}` as const,
    backupTimer: (instanceId: string) => `backupTimer:${instanceId}` as const,
    serverStart: (instanceId: string) => `serverStart:${instanceId}` as const,
    pendingInstanceCreate: (instanceId: string) => `pendingInstanceCreate:${instanceId}` as const,
    pendingInstanceDelete: (instanceId: string) => `pendingInstanceDelete:${instanceId}` as const,
    instanceCache: (instanceId: string) => `instanceCache:${instanceId}` as const,
    instanceSnapshot: () => 'instanceSnapshot' as const,
    playerChoices: () => 'playerchoices' as const,
    instancesAll: () => 'instancesAll' as const,
	networkCheck: () => 'server:networkCheck' as const,
};

export type AnyRedisKey = RedisKeys | ReturnType<(typeof RedisKeys)[keyof typeof RedisKeys]>;