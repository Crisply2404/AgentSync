//! 局域网临时分享：把一段文本生成一个可访问的链接，方便在另一台设备上复制。
//!
//! 典型用途：
//! - Windows 上生成“目标端初始化命令”的分享链接
//! - macOS 打开链接后，一键复制到终端执行（或手动复制）
//!
//! 安全边界（大白话）：
//! - 这不是公网服务，只适合在你信任的同一 Wi‑Fi / 局域网里用
//! - 链接带随机 token + 有过期时间，过期就访问不到了

use serde::Serialize;
use std::collections::HashMap;
use std::net::UdpSocket;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use once_cell::sync::OnceCell;
use tiny_http::{Header, Method, Response, Server, StatusCode};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShareStartResult {
  pub local_url: String,
  pub lan_url: Option<String>,
  pub local_raw_url: String,
  pub lan_raw_url: Option<String>,
  pub expires_at_ms: u64,
}

#[derive(Debug, Clone)]
struct ShareItem {
  content: String,
  expires_at_ms: u64,
}

struct ShareState {
  port: u16,
  items: Arc<Mutex<HashMap<String, ShareItem>>>,
}

static STATE: OnceCell<ShareState> = OnceCell::new();

fn now_ms() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis() as u64
}

fn cleanup_expired(map: &mut HashMap<String, ShareItem>) {
  let now = now_ms();
  map.retain(|_, v| v.expires_at_ms > now);
}

fn best_lan_ip() -> Option<String> {
  // 常见做法：UDP connect 不会真的发包，但能拿到本机对外的 IP。
  let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
  socket.connect("8.8.8.8:80").ok()?;
  let addr = socket.local_addr().ok()?;
  Some(addr.ip().to_string())
}

fn escape_html(s: &str) -> String {
  s.replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
}

fn html_page(title: &str, content: &str, expires_at_ms: u64) -> String {
  let safe_title = escape_html(title);
  let safe_content = escape_html(content);
  format!(
    r#"<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <style>
      body {{ margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; background: #f5f3ff; color: #0f172a; }}
      .wrap {{ max-width: 760px; margin: 0 auto; padding: 28px 16px; }}
      .card {{ background: rgba(255,255,255,.86); backdrop-filter: blur(12px); border: 1px solid rgba(148,163,184,.6); border-radius: 24px; padding: 18px; box-shadow: 0 8px 30px rgba(15,23,42,.06); }}
      h1 {{ font-size: 16px; margin: 0 0 8px; letter-spacing: .04em; text-transform: uppercase; color: #64748b; }}
      .hint {{ font-size: 12px; color: #64748b; line-height: 1.6; }}
      textarea {{ width: 100%; min-height: 240px; border-radius: 16px; border: 1px solid #e2e8f0; padding: 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; line-height: 1.5; color: #0f172a; background: #fff; outline: none; }}
      textarea:focus {{ border-color: #c7d2fe; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }}
      .actions {{ display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }}
      button {{ border-radius: 14px; border: 1px solid #e2e8f0; background: #fff; padding: 10px 14px; font-weight: 700; color: #0f172a; cursor: pointer; }}
      button.primary {{ background: #4f46e5; border-color: #4f46e5; color: #fff; box-shadow: 0 10px 24px rgba(99,102,241,.28); }}
      button:active {{ transform: scale(.98); }}
      .msg {{ font-size: 12px; color: #475569; margin-top: 10px; }}
      code {{ background: rgba(15,23,42,.06); padding: 1px 6px; border-radius: 8px; }}
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>{title}</h1>
        <div class="hint">
          你可以点击“复制”然后去终端粘贴执行；如果浏览器不让一键复制，就手动选中文本复制也行。<br/>
          过期时间：<code id="exp"></code>
        </div>
        <div style="margin-top: 12px;">
          <textarea id="t" readonly spellcheck="false">{content}</textarea>
        </div>
        <div class="actions">
          <button class="primary" onclick="copyText()">复制</button>
          <button onclick="selectAll()">全选</button>
        </div>
        <div class="msg" id="msg"></div>
      </div>
    </div>
    <script>
      const expiresAt = {expires_at_ms};
      document.getElementById('exp').textContent = new Date(expiresAt).toLocaleString();
      function selectAll() {{
        const ta = document.getElementById('t');
        ta.focus();
        ta.select();
      }}
      async function copyText() {{
        const ta = document.getElementById('t');
        const msg = document.getElementById('msg');
        msg.textContent = '';
        try {{
          // 兼容优先：先尝试旧的 execCommand（在 http 场景更容易成功）
          selectAll();
          const ok = document.execCommand('copy');
          if (ok) {{
            msg.textContent = '已复制（如果没生效就手动复制）。';
            return;
          }}
        }} catch (e) {{}}
        try {{
          // 新接口：需要安全上下文（https/localhost），在局域网 IP 上可能不可用
          if (navigator.clipboard) {{
            await navigator.clipboard.writeText(ta.value);
            msg.textContent = '已复制。';
            return;
          }}
        }} catch (e) {{}}
        msg.textContent = '浏览器限制了一键复制：请点“全选”后手动复制。';
      }}
    </script>
  </body>
</html>"#,
    title = safe_title,
    content = safe_content,
    expires_at_ms = expires_at_ms
  )
}

fn ensure_server() -> Result<&'static ShareState, String> {
  STATE.get_or_try_init(|| {
    let server = Server::http("0.0.0.0:0")
      .map_err(|e| format!("启动分享服务失败（{}）", e))?;

    let port = match server.server_addr() {
      tiny_http::ListenAddr::IP(a) => a.port(),
    };

    let items: Arc<Mutex<HashMap<String, ShareItem>>> = Arc::new(Mutex::new(HashMap::new()));
    let items_bg = Arc::clone(&items);

    std::thread::spawn(move || {
      for request in server.incoming_requests() {
        if request.method() != &Method::Get {
          let _ = request.respond(Response::empty(StatusCode(405)));
          continue;
        }

        let raw_url = request.url().to_string();
        let path = raw_url.split('?').next().unwrap_or(&raw_url);
        let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();

        let (token, is_raw) = if parts.len() == 2 && parts[0] == "s" {
          (parts[1].to_string(), false)
        } else if parts.len() == 3 && parts[0] == "s" && parts[2] == "raw" {
          (parts[1].to_string(), true)
        } else {
          let body = "not found";
          let _ = request.respond(
            Response::from_string(body).with_status_code(StatusCode(404)),
          );
          continue;
        };

        let item = {
          let mut map = match items_bg.lock() {
            Ok(m) => m,
            Err(_) => {
              let _ = request.respond(Response::empty(StatusCode(500)));
              continue;
            }
          };
          cleanup_expired(&mut map);
          map.get(&token).cloned()
        };

        let Some(item) = item else {
          let body = "expired or not found";
          let _ = request.respond(
            Response::from_string(body).with_status_code(StatusCode(404)),
          );
          continue;
        };

        if is_raw {
          let mut resp = Response::from_string(item.content);
          let _ = resp.add_header(
            Header::from_bytes("Content-Type", "text/plain; charset=utf-8").unwrap(),
          );
          let _ = request.respond(resp);
          continue;
        }

        let html = html_page("AgentSync 命令分享", &item.content, item.expires_at_ms);
        let mut resp = Response::from_string(html);
        let _ = resp.add_header(
          Header::from_bytes("Content-Type", "text/html; charset=utf-8").unwrap(),
        );
        let _ = request.respond(resp);
      }
    });

    Ok(ShareState { port, items })
  })
}

pub fn share_start(content: String, ttl_seconds: Option<u64>) -> Result<ShareStartResult, String> {
  if content.trim().is_empty() {
    return Err("要分享的内容为空".to_string());
  }

  let ttl = ttl_seconds.unwrap_or(10 * 60);
  let expires_at_ms = now_ms().saturating_add(ttl.saturating_mul(1000));

  let state = ensure_server()?;

  let token_full = Uuid::new_v4().simple().to_string();
  let token = token_full.chars().take(8).collect::<String>();

  {
    let mut map = state
      .items
      .lock()
      .map_err(|_| "分享服务内部状态异常（锁失败）".to_string())?;
    cleanup_expired(&mut map);
    map.insert(
      token.clone(),
      ShareItem {
        content,
        expires_at_ms,
      },
    );
  }

  let local_base = format!("http://localhost:{}", state.port);
  let local_url = format!("{}/s/{}", local_base, token);
  let local_raw_url = format!("{}/s/{}/raw", local_base, token);

  let lan_ip = best_lan_ip();
  let lan_url =
    lan_ip.as_ref().map(|ip| format!("http://{}:{}/s/{}", ip, state.port, token));
  let lan_raw_url =
    lan_ip.as_ref().map(|ip| format!("http://{}:{}/s/{}/raw", ip, state.port, token));

  Ok(ShareStartResult {
    local_url,
    lan_url,
    local_raw_url,
    lan_raw_url,
    expires_at_ms,
  })
}
