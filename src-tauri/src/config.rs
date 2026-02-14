//! AgentSync 配置：保存/读取本机配置文件（不包含任何密钥内容）。

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectItem {
  pub id: String,
  pub name: String,
  pub local_path: String,
  pub remote_dir_name: String,
  pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSyncConfig {
  pub schema_version: u32,
  pub rclone_path: Option<String>,
  pub connection: ConnectionConfig,
  pub remote: RemoteConfig,
  pub flags: FlagsConfig,
  pub excludes: Vec<String>,
  pub projects: Vec<ProjectItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
  pub host: String,
  pub port: u16,
  pub user: String,
  pub key_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteConfig {
  pub projects_root: String,
  pub backup_root: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlagsConfig {
  pub mirror_delete: bool,
  pub sync_codex: bool,
  pub sync_agents: bool,
}

pub fn default_config() -> AgentSyncConfig {
  AgentSyncConfig {
    schema_version: 1,
    rclone_path: None,
    connection: ConnectionConfig {
      host: "".to_string(),
      port: 22,
      user: "".to_string(),
      key_path: "".to_string(),
    },
    remote: RemoteConfig {
      projects_root: "AgentSync/projects".to_string(),
      backup_root: "AgentSync/.agentsync-backup".to_string(),
    },
    flags: FlagsConfig {
      mirror_delete: true,
      sync_codex: true,
      sync_agents: true,
    },
    excludes: vec![
      "node_modules/**".to_string(),
      "dist/**".to_string(),
      "build/**".to_string(),
      ".venv/**".to_string(),
      ".git/**".to_string(),
      ".DS_Store".to_string(),
    ],
    projects: vec![],
  }
}

pub fn agentsync_dir() -> Result<PathBuf, String> {
  let home = dirs::home_dir().ok_or_else(|| "找不到用户目录（home directory）".to_string())?;
  Ok(home.join(".agentsync"))
}

pub fn logs_dir() -> Result<PathBuf, String> {
  Ok(agentsync_dir()?.join("logs"))
}

pub fn history_file() -> Result<PathBuf, String> {
  Ok(agentsync_dir()?.join("history.jsonl"))
}

pub fn config_file() -> Result<PathBuf, String> {
  Ok(agentsync_dir()?.join("config.json"))
}

pub fn ensure_dir(path: &Path) -> Result<(), String> {
  fs::create_dir_all(path).map_err(|e| format!("创建目录失败：{}（{}）", path.display(), e))
}

pub fn load_or_default() -> Result<AgentSyncConfig, String> {
  let path = config_file()?;
  if !path.exists() {
    return Ok(default_config());
  }

  let text =
    fs::read_to_string(&path).map_err(|e| format!("读取配置失败：{}（{}）", path.display(), e))?;
  serde_json::from_str::<AgentSyncConfig>(&text)
    .map_err(|e| format!("解析配置失败：{}（{}）", path.display(), e))
}

pub fn save_config(cfg: &AgentSyncConfig) -> Result<(), String> {
  let dir = agentsync_dir()?;
  ensure_dir(&dir)?;
  let path = dir.join("config.json");
  let text = serde_json::to_string_pretty(cfg).map_err(|e| format!("序列化配置失败（{}）", e))?;
  fs::write(&path, text).map_err(|e| format!("写入配置失败：{}（{}）", path.display(), e))?;
  Ok(())
}

