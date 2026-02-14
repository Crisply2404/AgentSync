//! 同步任务状态管理（用于“显示进度 / 切换页面不影响同步”）。

use crate::runs::{SyncItemResult, SyncRunSummary};
use once_cell::sync::Lazy;
use serde::Serialize;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
  pub running: bool,
  pub run_id: Option<String>,
  pub started_at_ms: Option<u64>,
  pub ended_at_ms: Option<u64>,
  pub ok: Option<bool>,
  pub total_items: u32,
  pub done_items: u32,
  pub current_label: Option<String>,
  pub last_line: Option<String>,
  pub error: Option<String>,
  pub items: Vec<SyncItemResult>,
  pub summary: Option<SyncRunSummary>,
}

#[derive(Debug, Default, Clone)]
struct SyncRunState {
  running: bool,
  run_id: Option<String>,
  started_at_ms: Option<u64>,
  ended_at_ms: Option<u64>,
  ok: Option<bool>,
  total_items: u32,
  done_items: u32,
  current_label: Option<String>,
  last_line: Option<String>,
  error: Option<String>,
  items: Vec<SyncItemResult>,
  summary: Option<SyncRunSummary>,
}

static STATE: Lazy<Mutex<SyncRunState>> = Lazy::new(|| Mutex::new(SyncRunState::default()));

fn lock_state() -> Result<std::sync::MutexGuard<'static, SyncRunState>, String> {
  STATE
    .lock()
    .map_err(|_| "同步状态锁已损坏（poisoned mutex）".to_string())
}

pub fn start_run(run_id: String, started_at_ms: u64, total_items: u32) -> Result<(), String> {
  let mut s = lock_state()?;
  if s.running {
    return Err("已有同步任务在运行中，请稍后再试。".to_string());
  }
  *s = SyncRunState {
    running: true,
    run_id: Some(run_id),
    started_at_ms: Some(started_at_ms),
    ended_at_ms: None,
    ok: None,
    total_items,
    done_items: 0,
    current_label: Some("准备中…".to_string()),
    last_line: None,
    error: None,
    items: vec![],
    summary: None,
  };
  Ok(())
}

pub fn set_current_label(label: String) -> Result<(), String> {
  let mut s = lock_state()?;
  if !s.running {
    return Ok(());
  }
  s.current_label = Some(label);
  Ok(())
}

pub fn push_line(line: String) -> Result<(), String> {
  let mut s = lock_state()?;
  if !s.running {
    return Ok(());
  }
  let trimmed = line.trim();
  if trimmed.is_empty() {
    return Ok(());
  }
  // 控制长度，避免 UI 卡顿
  let mut v = trimmed.to_string();
  if v.len() > 260 {
    v.truncate(260);
  }
  s.last_line = Some(v);
  Ok(())
}

pub fn push_item_result(result: SyncItemResult) -> Result<(), String> {
  let mut s = lock_state()?;
  if !s.running {
    return Ok(());
  }
  s.done_items = s.done_items.saturating_add(1);
  s.items.push(result);
  Ok(())
}

pub fn finish_ok(summary: SyncRunSummary) -> Result<(), String> {
  let mut s = lock_state()?;
  s.running = false;
  s.ended_at_ms = Some(summary.ended_at_ms);
  s.ok = Some(summary.ok);
  s.summary = Some(summary);
  Ok(())
}

pub fn finish_err(run_id: String, ended_at_ms: u64, error: String) -> Result<(), String> {
  let mut s = lock_state()?;
  // 如果 run_id 不一致，尽量别把别的任务状态弄乱
  if s.run_id.as_deref() != Some(run_id.as_str()) {
    return Ok(());
  }
  s.running = false;
  s.ended_at_ms = Some(ended_at_ms);
  s.ok = Some(false);
  s.error = Some(error);
  Ok(())
}

pub fn get_status() -> Result<SyncStatus, String> {
  let s = lock_state()?;
  Ok(SyncStatus {
    running: s.running,
    run_id: s.run_id.clone(),
    started_at_ms: s.started_at_ms,
    ended_at_ms: s.ended_at_ms,
    ok: s.ok,
    total_items: s.total_items,
    done_items: s.done_items,
    current_label: s.current_label.clone(),
    last_line: s.last_line.clone(),
    error: s.error.clone(),
    items: s.items.clone(),
    summary: s.summary.clone(),
  })
}
