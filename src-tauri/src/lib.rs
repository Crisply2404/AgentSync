//! AgentSync 的 Tauri 后端：负责配置读写、连接测试、调用 rclone 执行同步。

mod config;
mod rclone;
mod runs;
mod share_server;
mod ssh_keys;
mod sync_manager;

use crate::config::AgentSyncConfig;
use crate::runs::SyncRunSummary;
use crate::share_server::ShareStartResult;
use crate::ssh_keys::EnsureSshKeypairResult;
use crate::sync_manager::SyncStatus;
use serde::Serialize;
use uuid::Uuid;

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
async fn sync_start(config: AgentSyncConfig) -> Result<String, String> {
  rclone::validate_for_run(&config)?;
  let run_id = Uuid::new_v4().simple().to_string();
  let started_at_ms = {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap_or_default()
      .as_millis() as u64
  };
  let total = rclone::estimate_total_items(&config)?;
  sync_manager::start_run(run_id.clone(), started_at_ms, total)?;

  tauri::async_runtime::spawn_blocking({
    let run_id = run_id.clone();
    move || {
      struct Progress;
      impl rclone::SyncProgress for Progress {
        fn on_item_start(&mut self, label: &str) {
          let _ = sync_manager::set_current_label(label.to_string());
        }

        fn on_line(&mut self, line: &str) {
          let _ = sync_manager::push_line(line.to_string());
        }

        fn on_item_done(&mut self, result: &crate::runs::SyncItemResult) {
          let _ = sync_manager::push_item_result(result.clone());
        }
      }

      let mut progress = Progress;
      let result = rclone::run_sync_with_id(&config, run_id.clone(), &mut progress);

      match result {
        Ok(summary) => {
          let _ = sync_manager::finish_ok(summary);
        }
        Err(e) => {
          let ended_at_ms = {
            use std::time::{SystemTime, UNIX_EPOCH};
            SystemTime::now()
              .duration_since(UNIX_EPOCH)
              .unwrap_or_default()
              .as_millis() as u64
          };
          let _ = sync_manager::finish_err(run_id, ended_at_ms, e);
        }
      }
    }
  });

  Ok(run_id)
}

#[tauri::command]
fn sync_status() -> Result<SyncStatus, String> {
  sync_manager::get_status()
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
      sync_start,
      sync_status,
      runs_list,
      run_log_read,
      ssh_keypair_ensure,
      ssh_public_key_read,
      share_start
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
