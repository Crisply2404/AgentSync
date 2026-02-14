export type ProjectItem = {
  id: string;
  name: string;
  localPath: string;
  remoteDirName: string;
  enabled: boolean;
};

export type AgentSyncConfig = {
  schemaVersion: 1;
  rclonePath?: string | null;
  connection: {
    host: string;
    port: number;
    user: string;
    keyPath: string;
  };
  remote: {
    projectsRoot: string;
    backupRoot: string;
  };
  flags: {
    mirrorDelete: boolean;
    syncCodex: boolean;
    syncAgents: boolean;
  };
  excludes: string[];
  projects: ProjectItem[];
};

export type ConnectionTestResult = {
  ok: boolean;
  message: string;
};

export type EnsureSshKeypairResult = {
  privateKeyPath: string;
  publicKey: string;
};

export type ShareStartResult = {
  localUrl: string;
  lanUrl?: string | null;
  localRawUrl: string;
  lanRawUrl?: string | null;
  expiresAtMs: number;
};

export type SyncItemResult = {
  label: string;
  ok: boolean;
  message: string;
};

export type SyncRunSummary = {
  runId: string;
  startedAtMs: number;
  endedAtMs: number;
  ok: boolean;
  backupRoot: string;
  logPath: string;
  items: SyncItemResult[];
};

export type RunRecord = SyncRunSummary;
