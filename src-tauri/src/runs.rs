//! 运行历史与日志：每次同步写一条记录，方便回看。

use crate::config;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncItemResult {
  pub label: String,
  pub ok: bool,
  pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncRunSummary {
  pub run_id: String,
  pub started_at_ms: u64,
  pub ended_at_ms: u64,
  pub ok: bool,
  pub backup_root: String,
  pub log_path: String,
  pub items: Vec<SyncItemResult>,
}

pub fn log_file_path(run_id: &str) -> Result<PathBuf, String> {
  Ok(config::logs_dir()?.join(format!("{}.log", run_id)))
}

pub fn ensure_logs_dir() -> Result<(), String> {
  config::ensure_dir(&config::logs_dir()?)
}

pub fn write_log_header(mut file: &fs::File, run_id: &str) -> Result<(), String> {
  writeln!(file, "AgentSync run_id: {}", run_id)
    .map_err(|e| format!("写入日志失败（{}）", e))?;
  Ok(())
}

pub fn append_run(record: &SyncRunSummary) -> Result<(), String> {
  let dir = config::agentsync_dir()?;
  config::ensure_dir(&dir)?;
  let path = config::history_file()?;

  let line =
    serde_json::to_string(record).map_err(|e| format!("序列化历史记录失败（{}）", e))?;
  let mut f = fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(&path)
    .map_err(|e| format!("写入历史记录失败：{}（{}）", path.display(), e))?;
  writeln!(f, "{}", line).map_err(|e| format!("写入历史记录失败（{}）", e))?;
  Ok(())
}

pub fn list_runs() -> Result<Vec<SyncRunSummary>, String> {
  let path = config::history_file()?;
  if !path.exists() {
    return Ok(vec![]);
  }

  let f = fs::File::open(&path).map_err(|e| format!("读取历史记录失败：{}（{}）", path.display(), e))?;
  let reader = BufReader::new(f);

  let mut out = Vec::new();
  for line in reader.lines() {
    let line = match line {
      Ok(v) => v,
      Err(_) => continue,
    };
    if line.trim().is_empty() {
      continue;
    }
    if let Ok(r) = serde_json::from_str::<SyncRunSummary>(&line) {
      out.push(r);
    }
  }

  out.sort_by(|a, b| b.started_at_ms.cmp(&a.started_at_ms));
  Ok(out)
}

pub fn read_log(run_id: &str) -> Result<String, String> {
  let path = log_file_path(run_id)?;
  if !path.exists() {
    return Err(format!("找不到日志文件：{}", path.display()));
  }
  fs::read_to_string(&path).map_err(|e| format!("读取日志失败：{}（{}）", path.display(), e))
}

pub fn append_log_line(file: &mut fs::File, text: &str) -> Result<(), String> {
  writeln!(file, "{}", text).map_err(|e| format!("写入日志失败（{}）", e))?;
  Ok(())
}

pub fn ensure_parent_dir(path: &Path) -> Result<(), String> {
  if let Some(parent) = path.parent() {
    config::ensure_dir(parent)?;
  }
  Ok(())
}

