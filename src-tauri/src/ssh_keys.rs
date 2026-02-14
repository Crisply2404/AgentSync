//! SSH 密钥相关：生成 AgentSync 专用密钥、从私钥读取公钥。
//!
//! 设计目标（大白话）：
//! - 用户不想自己折腾 ssh-keygen，所以这里帮他一键生成。
//! - 私钥只保存在本机磁盘里（~/.agentsync/keys/），不会回传到前端。

use crate::config;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnsureSshKeypairResult {
  pub private_key_path: String,
  pub public_key: String,
}

fn keys_dir() -> Result<PathBuf, String> {
  Ok(config::agentsync_dir()?.join("keys"))
}

fn default_private_key_path() -> Result<PathBuf, String> {
  Ok(keys_dir()?.join("agentsync_ed25519"))
}

fn public_key_path_for_private(private_key_path: &Path) -> PathBuf {
  PathBuf::from(format!("{}.pub", private_key_path.display()))
}

fn ssh_keygen_output(args: &[String]) -> Result<std::process::Output, String> {
  Command::new("ssh-keygen")
    .args(args)
    .output()
    .map_err(|e| format!("执行 ssh-keygen 失败（{}）。请确认已安装 OpenSSH 客户端。", e))
}

fn read_pub_from_file(pub_path: &Path) -> Result<String, String> {
  let text = fs::read_to_string(pub_path)
    .map_err(|e| format!("读取公钥失败：{}（{}）", pub_path.display(), e))?;
  let key = text.trim().to_string();
  if key.is_empty() {
    return Err(format!("公钥文件内容为空：{}", pub_path.display()));
  }
  Ok(key)
}

fn read_pub_by_keygen(private_key_path: &Path) -> Result<String, String> {
  let mut args = Vec::new();
  args.push("-y".to_string());
  args.push("-f".to_string());
  args.push(private_key_path.display().to_string());
  let out = ssh_keygen_output(&args)?;
  if !out.status.success() {
    let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
    return Err(format!("读取公钥失败（ssh-keygen -y）：{}", err));
  }
  let key = String::from_utf8_lossy(&out.stdout).trim().to_string();
  if key.is_empty() {
    return Err("读取公钥失败：ssh-keygen 输出为空".to_string());
  }
  Ok(key)
}

pub fn read_public_key(private_key_path: &Path) -> Result<String, String> {
  if !private_key_path.is_file() {
    return Err(format!("私钥文件不存在：{}", private_key_path.display()));
  }
  let pub_path = public_key_path_for_private(private_key_path);
  if pub_path.is_file() {
    return read_pub_from_file(&pub_path);
  }
  // 兼容：只有私钥，没有 .pub 文件的情况
  read_pub_by_keygen(private_key_path)
}

pub fn ensure_keypair(force: bool) -> Result<EnsureSshKeypairResult, String> {
  let dir = keys_dir()?;
  config::ensure_dir(&dir)?;

  let private_key_path = default_private_key_path()?;
  let pub_path = public_key_path_for_private(&private_key_path);

  if force {
    let _ = fs::remove_file(&private_key_path);
    let _ = fs::remove_file(&pub_path);
  }

  if !private_key_path.is_file() || !pub_path.is_file() {
    let mut args = Vec::new();
    args.push("-t".to_string());
    args.push("ed25519".to_string());
    args.push("-C".to_string());
    args.push("agentsync".to_string());
    args.push("-N".to_string());
    args.push("".to_string());
    args.push("-f".to_string());
    args.push(private_key_path.display().to_string());
    args.push("-q".to_string());

    let out = ssh_keygen_output(&args)?;
    if !out.status.success() {
      let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
      return Err(format!("生成密钥失败（ssh-keygen）：{}", err));
    }
  }

  let public_key = read_public_key(&private_key_path)?;

  Ok(EnsureSshKeypairResult {
    private_key_path: private_key_path.display().to_string(),
    public_key,
  })
}

