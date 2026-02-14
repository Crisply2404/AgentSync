
export interface SSHConfig {
  host: string;
  port: number;
  user: string;
  keyPath: string;
  remoteRoot: string;
}

export interface SyncItem {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
}

export interface GlobalSettings {
  syncCodex: boolean;
  syncAgents: boolean;
  mirrorDelete: boolean;
  excludeRules: string[];
}

export enum SyncStatus {
  IDLE = 'idle',
  PREPARING = 'preparing',
  SYNCING = 'syncing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface SyncStats {
  new: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
  current: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  duration: string;
  status: SyncStatus;
  summary: {
    added: number;
    updated: number;
    errors: number;
  };
  log: string[];
}
