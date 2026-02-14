//! AgentSync 的 Tauri 后端：负责配置读写、连接测试、调用 rclone 执行同步。

mod config;
mod rclone;
mod runs;
mod share_server;
mod ssh_keys;

use crate::config::AgentSyncConfig;
use crate::runs::SyncRunSummary;
use crate::share_server::ShareStartResult;
use crate::ssh_keys::EnsureSshKeypairResult;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionTestResult {
  pub ok: bool,
  pub message: String,
}

#[tauri::command]
fn config_get() -> Result<AgentSyncConfig, String> {
  config::load_or_default()
}

#[tauri::command]
fn config_save(config: AgentSyncConfig) -> Result<(), String> {
  config::save_config(&config)
}

#[tauri::command]
fn runs_list() -> Result<Vec<SyncRunSummary>, String> {
  runs::list_runs()
}

#[tauri::command]
fn run_log_read(run_id: String) -> Result<String, String> {
  runs::read_log(&run_id)
}

#[tauri::command]
fn connection_test(config: AgentSyncConfig) -> Result<ConnectionTestResult, String> {
  let res = rclone::test_connection(&config)?;
  Ok(ConnectionTestResult {
    ok: res.ok,
    message: res.message,
  })
}

#[tauri::command]
async fn sync_run(config: AgentSyncConfig) -> Result<SyncRunSummary, String> {
  tauri::async_runtime::spawn_blocking(move || rclone::run_sync(&config))
    .await
    .map_err(|e| format!("同步任务异常中断（{}）", e))?
}

#[tauri::command]
fn ssh_keypair_ensure(force: bool) -> Result<EnsureSshKeypairResult, String> {
  ssh_keys::ensure_keypair(force)
}

#[tauri::command]
fn ssh_public_key_read(private_key_path: String) -> Result<String, String> {
  ssh_keys::read_public_key(std::path::Path::new(&private_key_path))
}

#[tauri::command]
fn share_start(content: String) -> Result<ShareStartResult, String> {
  share_server::share_start(content, None)
}

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      config_get,
      config_save,
      connection_test,
      sync_run,
      runs_list,
      run_log_read,
      ssh_keypair_ensure,
      ssh_public_key_read,
      share_start
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
