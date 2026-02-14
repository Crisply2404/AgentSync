import { invoke } from "@tauri-apps/api/core";
import type {
  AgentSyncConfig,
  ConnectionTestResult,
  EnsureSshKeypairResult,
  ShareStartResult,
  RunRecord,
  SyncRunSummary,
} from "./types";

export async function configGet(): Promise<AgentSyncConfig> {
  return invoke("config_get");
}

export async function configSave(config: AgentSyncConfig): Promise<void> {
  return invoke("config_save", { config });
}

export async function connectionTest(
  config: AgentSyncConfig,
): Promise<ConnectionTestResult> {
  return invoke("connection_test", { config });
}

export async function syncRun(config: AgentSyncConfig): Promise<SyncRunSummary> {
  return invoke("sync_run", { config });
}

export async function runsList(): Promise<RunRecord[]> {
  return invoke("runs_list");
}

export async function runLogRead(runId: string): Promise<string> {
  return invoke("run_log_read", { run_id: runId });
}

export async function sshKeypairEnsure(
  force = false,
): Promise<EnsureSshKeypairResult> {
  return invoke("ssh_keypair_ensure", { force });
}

export async function sshPublicKeyRead(privateKeyPath: string): Promise<string> {
  return invoke("ssh_public_key_read", { private_key_path: privateKeyPath });
}

export async function shareStart(content: string): Promise<ShareStartResult> {
  return invoke("share_start", { content });
}
