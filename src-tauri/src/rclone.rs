//! rclone 相关：生成临时配置、测试连接、执行同步命令。

use crate::config::{AgentSyncConfig, ProjectItem};
use crate::runs::{self, SyncItemResult, SyncRunSummary};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub struct ConnectionTestResult {
  pub ok: bool,
  pub message: String,
}

fn now_ms() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis() as u64
}

fn normalize_remote_path(input: &str) -> String {
  let mut s = input.trim().replace('\\', "/");
  if s == "~" {
    return "".to_string();
  }
  if let Some(rest) = s.strip_prefix("~/") {
    s = rest.to_string();
  }
  s
}

fn join_remote(a: &str, b: &str) -> String {
  let a = normalize_remote_path(a);
  let b = normalize_remote_path(b);
  if a.is_empty() {
    return b;
  }
  if b.is_empty() {
    return a;
  }
  format!("{}/{}", a.trim_end_matches('/'), b.trim_start_matches('/'))
}

fn ensure_non_empty(label: &str, value: &str) -> Result<(), String> {
  if value.trim().is_empty() {
    return Err(format!("{}不能为空", label));
  }
  Ok(())
}

pub fn resolve_rclone(cfg: &AgentSyncConfig) -> Result<PathBuf, String> {
  if let Some(p) = cfg.rclone_path.as_ref() {
    if !p.trim().is_empty() && Path::new(p).is_file() {
      return Ok(PathBuf::from(p));
    }
  }

  let exe = if cfg!(windows) { "rclone.exe" } else { "rclone" };
  let path = env::var_os("PATH").ok_or_else(|| "找不到 PATH 环境变量，无法定位 rclone".to_string())?;
  for dir in env::split_paths(&path) {
    let candidate = dir.join(exe);
    if candidate.is_file() {
      return Ok(candidate);
    }
  }

  Err("没找到 rclone：请先安装 rclone 并加入 PATH，或在连接设置里选择 rclone 可执行文件。".to_string())
}

fn validate_basic(cfg: &AgentSyncConfig) -> Result<(), String> {
  ensure_non_empty("Host", &cfg.connection.host)?;
  ensure_non_empty("User", &cfg.connection.user)?;
  ensure_non_empty("SSH 私钥路径", &cfg.connection.key_path)?;
  ensure_non_empty("目标端项目根目录", &cfg.remote.projects_root)?;
  ensure_non_empty("备份根目录", &cfg.remote.backup_root)?;

  if !Path::new(&cfg.connection.key_path).is_file() {
    return Err(format!("SSH 私钥文件不存在：{}", cfg.connection.key_path));
  }
  Ok(())
}

fn write_temp_rclone_config(cfg: &AgentSyncConfig) -> Result<PathBuf, String> {
  let id = Uuid::new_v4().simple().to_string();
  let path = env::temp_dir().join(format!("agentsync-rclone-{}.conf", id));

  let key_file = cfg.connection.key_path.replace('\\', "/");
  let content = format!(
    "[remote]\n\
type = sftp\n\
host = {host}\n\
user = {user}\n\
port = {port}\n\
key_file = {key_file}\n",
    host = cfg.connection.host.trim(),
    user = cfg.connection.user.trim(),
    port = cfg.connection.port,
    key_file = key_file
  );

  fs::write(&path, content).map_err(|e| format!("写入临时 rclone 配置失败：{}（{}）", path.display(), e))?;
  Ok(path)
}

fn rclone_output(rclone: &Path, args: &[String]) -> Result<std::process::Output, String> {
  Command::new(rclone)
    .args(args)
    .output()
    .map_err(|e| format!("执行 rclone 失败：{}（{}）", rclone.display(), e))
}

fn make_common_args(rclone_conf: &Path) -> Vec<String> {
  vec![
    "--config".to_string(),
    rclone_conf.display().to_string(),
    "--log-level".to_string(),
    "INFO".to_string(),
    "--stats-one-line".to_string(),
  ]
}

pub fn test_connection(cfg: &AgentSyncConfig) -> Result<ConnectionTestResult, String> {
  validate_basic(cfg)?;
  let rclone = resolve_rclone(cfg)?;
  let rclone_conf = write_temp_rclone_config(cfg)?;

  let mut messages: Vec<String> = Vec::new();
  let result = (|| -> Result<(), String> {
    // 1) 仅测试能否连上（lsd 会触发连接）
    let mut args = make_common_args(&rclone_conf);
    args.extend(["lsd".to_string(), "remote:".to_string()]);
    let out = rclone_output(&rclone, &args)?;
    if !out.status.success() {
      let err = String::from_utf8_lossy(&out.stderr).to_string();
      return Err(format!("连接失败：{}", err.trim()));
    }
    messages.push("连接成功：能连上目标电脑。".to_string());

    // 2) 测试目标目录可写（mkdir 会触发写入权限检查）
    let projects_root = normalize_remote_path(&cfg.remote.projects_root);
    let backup_root = normalize_remote_path(&cfg.remote.backup_root);

    let mut mk1 = make_common_args(&rclone_conf);
    mk1.extend(["mkdir".to_string(), format!("remote:{}", projects_root)]);
    let out1 = rclone_output(&rclone, &mk1)?;
    if !out1.status.success() {
      let err = String::from_utf8_lossy(&out1.stderr).to_string();
      return Err(format!("目标端目录不可写（projects root）：{}", err.trim()));
    }

    let mut mk2 = make_common_args(&rclone_conf);
    mk2.extend(["mkdir".to_string(), format!("remote:{}", backup_root)]);
    let out2 = rclone_output(&rclone, &mk2)?;
    if !out2.status.success() {
      let err = String::from_utf8_lossy(&out2.stderr).to_string();
      return Err(format!("目标端目录不可写（backup root）：{}", err.trim()));
    }

    messages.push("写入权限正常：目标端目录可创建/可写。".to_string());
    Ok(())
  })();

  let _ = fs::remove_file(&rclone_conf);

  match result {
    Ok(()) => Ok(ConnectionTestResult {
      ok: true,
      message: messages.join("\n"),
    }),
    Err(e) => Ok(ConnectionTestResult {
      ok: false,
      message: e,
    }),
  }
}

fn local_home_dir() -> Result<PathBuf, String> {
  dirs::home_dir().ok_or_else(|| "找不到本机用户目录（home directory）".to_string())
}

fn codex_paths() -> Result<(PathBuf, PathBuf), String> {
  let home = local_home_dir()?;
  let codex_root = home.join(".codex");
  Ok((codex_root.join("config.toml"), codex_root.join("sessions")))
}

fn agents_dir() -> Result<PathBuf, String> {
  Ok(local_home_dir()?.join(".agents"))
}

fn build_project_item_args(
  cfg: &AgentSyncConfig,
  rclone_conf: &Path,
  rclone_cmd: &str,
  local_path: &str,
  remote_dest: &str,
  backup_dir: &str,
  use_excludes: bool,
) -> Vec<String> {
  let mut args = make_common_args(rclone_conf);
  args.push(rclone_cmd.to_string());
  args.push(local_path.to_string());
  args.push(format!("remote:{}", remote_dest));
  args.push("--backup-dir".to_string());
  args.push(format!("remote:{}", backup_dir));

  if use_excludes {
    for ex in &cfg.excludes {
      if ex.trim().is_empty() {
        continue;
      }
      args.push("--exclude".to_string());
      args.push(ex.trim().to_string());
    }
  }

  args
}

fn run_one(
  rclone: &Path,
  log: &mut fs::File,
  label: &str,
  args: &[String],
) -> SyncItemResult {
  let _ = runs::append_log_line(log, &format!("---- {} ----", label));
  let _ = runs::append_log_line(log, &format!("cmd: rclone {}", args.join(" ")));

  match rclone_output(rclone, args) {
    Ok(out) => {
      let stdout = String::from_utf8_lossy(&out.stdout);
      let stderr = String::from_utf8_lossy(&out.stderr);
      if !stdout.trim().is_empty() {
        let _ = runs::append_log_line(log, stdout.trim_end());
      }
      if !stderr.trim().is_empty() {
        let _ = runs::append_log_line(log, stderr.trim_end());
      }
      if out.status.success() {
        SyncItemResult {
          label: label.to_string(),
          ok: true,
          message: "完成".to_string(),
        }
      } else {
        SyncItemResult {
          label: label.to_string(),
          ok: false,
          message: format!("失败（exit code {:?}）", out.status.code()),
        }
      }
    }
    Err(e) => {
      let _ = runs::append_log_line(log, &format!("执行失败：{}", e));
      SyncItemResult {
        label: label.to_string(),
        ok: false,
        message: e,
      }
    }
  }
}

fn project_label(p: &ProjectItem) -> String {
  format!("项目: {}", p.name)
}

pub fn run_sync(cfg: &AgentSyncConfig) -> Result<SyncRunSummary, String> {
  validate_basic(cfg)?;
  let rclone = resolve_rclone(cfg)?;
  let rclone_conf = write_temp_rclone_config(cfg)?;

  let run_id = Uuid::new_v4().simple().to_string();
  let started_at_ms = now_ms();

  runs::ensure_logs_dir()?;
  let log_path = runs::log_file_path(&run_id)?;
  runs::ensure_parent_dir(&log_path)?;
  let mut log = fs::File::create(&log_path)
    .map_err(|e| format!("创建日志文件失败：{}（{}）", log_path.display(), e))?;
  runs::write_log_header(&log, &run_id)?;

  let projects_root = normalize_remote_path(&cfg.remote.projects_root);
  let backup_root = normalize_remote_path(&cfg.remote.backup_root);
  let run_backup_root = join_remote(&backup_root, &run_id);

  let mut items: Vec<SyncItemResult> = Vec::new();

  // 1) 项目（启用的）
  for p in cfg.projects.iter().filter(|p| p.enabled) {
    let remote_dest = join_remote(&projects_root, &p.remote_dir_name);
    let backup_dir = join_remote(&run_backup_root, &join_remote("projects", &p.remote_dir_name));

    let cmd = if cfg.flags.mirror_delete { "sync" } else { "copy" };
    let args = build_project_item_args(
      cfg,
      &rclone_conf,
      cmd,
      &p.local_path,
      &remote_dest,
      &backup_dir,
      true,
    );

    items.push(run_one(&rclone, &mut log, &project_label(p), &args));
  }

  // 2) Codex：只同步 config.toml + sessions/
  if cfg.flags.sync_codex {
    let (local_config, local_sessions) = codex_paths()?;

    if local_sessions.is_dir() {
      let backup_dir = join_remote(&run_backup_root, "codex/sessions");
      let cmd = if cfg.flags.mirror_delete { "sync" } else { "copy" };
      let args = build_project_item_args(
        cfg,
        &rclone_conf,
        cmd,
        &local_sessions.display().to_string(),
        ".codex/sessions",
        &backup_dir,
        false,
      );
      items.push(run_one(&rclone, &mut log, "Codex: sessions", &args));
    } else {
      items.push(SyncItemResult {
        label: "Codex: sessions".to_string(),
        ok: true,
        message: "本机未找到 .codex/sessions，已跳过".to_string(),
      });
    }

    if local_config.is_file() {
      // copyto：把单个文件放到固定位置
      let mut args = make_common_args(&rclone_conf);
      args.push("copyto".to_string());
      args.push(local_config.display().to_string());
      args.push("remote:.codex/config.toml".to_string());
      args.push("--backup-dir".to_string());
      args.push(format!("remote:{}", join_remote(&run_backup_root, "codex/config")));
      items.push(run_one(&rclone, &mut log, "Codex: config.toml", &args));
    } else {
      items.push(SyncItemResult {
        label: "Codex: config.toml".to_string(),
        ok: true,
        message: "本机未找到 .codex/config.toml，已跳过".to_string(),
      });
    }
  }

  // 3) .agents
  if cfg.flags.sync_agents {
    let local_agents = agents_dir()?;
    if local_agents.is_dir() {
      let backup_dir = join_remote(&run_backup_root, "agents");
      let cmd = if cfg.flags.mirror_delete { "sync" } else { "copy" };
      let args = build_project_item_args(
        cfg,
        &rclone_conf,
        cmd,
        &local_agents.display().to_string(),
        ".agents",
        &backup_dir,
        false,
      );
      items.push(run_one(&rclone, &mut log, ".agents", &args));
    } else {
      items.push(SyncItemResult {
        label: ".agents".to_string(),
        ok: true,
        message: "本机未找到 ~/.agents，已跳过".to_string(),
      });
    }
  }

  let ended_at_ms = now_ms();
  let ok = items.iter().all(|i| i.ok);

  let _ = fs::remove_file(&rclone_conf);

  let summary = SyncRunSummary {
    run_id: run_id.clone(),
    started_at_ms,
    ended_at_ms,
    ok,
    backup_root: run_backup_root.clone(),
    log_path: log_path.display().to_string(),
    items: items.clone(),
  };

  let _ = runs::append_log_line(&mut log, "---- summary ----");
  let _ = runs::append_log_line(&mut log, &format!("ok: {}", ok));
  let _ = runs::append_log_line(&mut log, &format!("backup_root: {}", run_backup_root));

  runs::append_run(&summary)?;
  Ok(summary)
}

