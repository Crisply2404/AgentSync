import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useEffect, useMemo, useState } from "react";
import {
  connectionTest,
  shareStart,
  sshKeypairEnsure,
  sshPublicKeyRead,
} from "../lib/api";
import { useAgentSyncConfig } from "../lib/useAgentSyncConfig";
import type { ShareStartResult } from "../lib/types";

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900",
        "outline-none transition-all focus:border-indigo-200",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900",
        "outline-none transition-all focus:border-indigo-200",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function normalizeRemotePath(input: string) {
  let s = input.trim().replace(/\\/g, "/");
  if (s === "~") return "";
  if (s.startsWith("~/")) s = s.slice(2);
  return s.replace(/^\/+/, "");
}

function shSingleQuote(s: string) {
  return `'${s.replace(/'/g, `'\"'\"'`)}'`;
}

function psSingleQuote(s: string) {
  return `'${s.replace(/'/g, "''")}'`;
}

function generateSetupScript(params: {
  targetOs: "mac_linux" | "windows";
  publicKey: string;
  projectsRoot: string;
  backupRoot: string;
}) {
  const projectsRoot = normalizeRemotePath(params.projectsRoot);
  const backupRoot = normalizeRemotePath(params.backupRoot);

  if (!params.publicKey.trim()) return "";
  if (!projectsRoot || !backupRoot) return "";

  if (params.targetOs === "windows") {
    const key = psSingleQuote(params.publicKey.trim());
    const projects = psSingleQuote(projectsRoot.replace(/\//g, "\\"));
    const backup = psSingleQuote(backupRoot.replace(/\//g, "\\"));
    return [
      "$ErrorActionPreference = 'Stop'",
      "$sshDir = Join-Path $env:USERPROFILE '.ssh'",
      "New-Item -ItemType Directory -Force -Path $sshDir | Out-Null",
      "$ak = Join-Path $sshDir 'authorized_keys'",
      "if (!(Test-Path $ak)) { Set-Content -Path $ak -Value '' -Encoding ascii }",
      `$key = ${key}`,
      "$exists = Select-String -Path $ak -SimpleMatch -Quiet -Pattern $key",
      "if (-not $exists) { Add-Content -Path $ak -Value $key -Encoding ascii }",
      `New-Item -ItemType Directory -Force -Path (Join-Path $env:USERPROFILE ${projects}) | Out-Null`,
      `New-Item -ItemType Directory -Force -Path (Join-Path $env:USERPROFILE ${backup}) | Out-Null`,
      "Write-Host 'AgentSync SSH setup done'",
    ].join("\r\n");
  }

  const key = shSingleQuote(params.publicKey.trim());
  const projectsDir = shSingleQuote(projectsRoot);
  const backupDir = shSingleQuote(backupRoot);
  return [
    "set -e",
    `KEY=${key}`,
    'SSH_DIR="$HOME/.ssh"',
    'AK="$SSH_DIR/authorized_keys"',
    'mkdir -p "$SSH_DIR"',
    'touch "$AK"',
    'chmod 700 "$SSH_DIR"',
    'chmod 600 "$AK"',
    'grep -qxF "$KEY" "$AK" || echo "$KEY" >> "$AK"',
    `mkdir -p "$HOME"/${projectsDir} "$HOME"/${backupDir}`,
    "echo 'AgentSync SSH setup done'",
  ].join("\n");
}

export function DeviceSetupPage() {
  const { config, setConfig, saving, save, error, setError } =
    useAgentSyncConfig();

  const [targetOs, setTargetOs] = useState<"mac_linux" | "windows">("mac_linux");

  const [keyLoading, setKeyLoading] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [publicKeyErr, setPublicKeyErr] = useState<string | null>(null);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [share, setShare] = useState<ShareStartResult | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const macInfoCmd = useMemo(() => {
    return [
      "whoami",
      "scutil --get LocalHostName",
      "echo \"Host 候选：$(scutil --get LocalHostName).local\"",
      "ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1",
      "echo \"Port：22\"",
    ].join("\n");
  }, []);

  useEffect(() => {
    let canceled = false;
    (async () => {
      const keyPath = config.connection.keyPath.trim();
      if (!keyPath) {
        setPublicKey("");
        setPublicKeyErr(null);
        return;
      }
      try {
        const key = await sshPublicKeyRead(keyPath);
        if (canceled) return;
        setPublicKey(key);
        setPublicKeyErr(null);
      } catch (e) {
        if (canceled) return;
        setPublicKey("");
        setPublicKeyErr(String(e));
      }
    })();
    return () => {
      canceled = true;
    };
  }, [config.connection.keyPath]);

  const setupScript = useMemo(() => {
    return generateSetupScript({
      targetOs,
      publicKey,
      projectsRoot: config.remote.projectsRoot,
      backupRoot: config.remote.backupRoot,
    });
  }, [targetOs, publicKey, config.remote.projectsRoot, config.remote.backupRoot]);

  useEffect(() => {
    setShare(null);
    setShareErr(null);
  }, [setupScript]);

  async function pickKeyFile() {
    const selected = await openDialog({
      multiple: false,
      directory: false,
      title: "选择 SSH 私钥文件",
    });
    if (typeof selected === "string") {
      setConfig({
        ...config,
        connection: { ...config.connection, keyPath: selected },
      });
    }
  }

  async function ensureKeypair(force: boolean) {
    setKeyLoading(true);
    try {
      const res = await sshKeypairEnsure(force);
      setConfig({
        ...config,
        connection: { ...config.connection, keyPath: res.privateKeyPath },
      });
      setPublicKey(res.publicKey);
      setPublicKeyErr(null);
      setError(null);
    } catch (e) {
      setPublicKeyErr(String(e));
    } finally {
      setKeyLoading(false);
    }
  }

  async function onCopy(text: string) {
    setCopyHint(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint("已复制");
      setTimeout(() => setCopyHint(null), 1500);
    } catch {
      setCopyHint("复制失败：请手动选中文本复制");
    }
  }

  async function onTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await connectionTest(config);
      setTestResult(res.message);
      setError(null);
    } catch (e) {
      setTestResult("测试失败：" + String(e));
    } finally {
      setTesting(false);
    }
  }

  async function onShareScript() {
    if (!setupScript) return;
    setSharing(true);
    setShareErr(null);
    try {
      const res = await shareStart(setupScript);
      setShare(res);
    } catch (e) {
      setShare(null);
      setShareErr(String(e));
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">设备向导（SSH 模式）</div>
        <div className="mt-1 text-sm text-slate-600">
          目标电脑不用装 AgentSync，只要开启 SSH，然后粘贴执行一次初始化命令即可。
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          第 1 步：准备 SSH 密钥
        </div>
        <div className="mt-2 text-xs text-slate-500">
          建议用“专用密钥”，别拿你平时的主力密钥到处用。
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-700">
              当前私钥路径（本机）
            </div>
            <div className="flex gap-2">
              <Input value={config.connection.keyPath} readOnly />
              <button
                className="shrink-0 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:bg-white active:scale-[0.98]"
                onClick={pickKeyFile}
              >
                选择
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200/70 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                onClick={() => ensureKeypair(false)}
                disabled={keyLoading}
              >
                {keyLoading ? "处理中…" : "一键生成/复用专用密钥"}
              </button>
              <button
                className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-100"
                onClick={() => ensureKeypair(true)}
                disabled={keyLoading}
                title="会删除旧的专用密钥并重新生成"
              >
                重新生成
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-slate-700">公钥（给目标端用）</div>
              <button
                className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition-all hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-100"
                onClick={() => onCopy(publicKey)}
                disabled={!publicKey}
              >
                复制公钥
              </button>
            </div>
            <TextArea
              rows={4}
              value={publicKey}
              readOnly
              className="font-mono text-xs leading-relaxed"
            />
            {publicKeyErr ? (
              <div className="text-xs text-rose-700">{publicKeyErr}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          第 2 步：填目标电脑信息
        </div>
        <div className="mt-2 text-xs leading-relaxed text-slate-500">
          不知道怎么填？在目标电脑（macOS）打开终端：
          <span className="font-mono">whoami</span> 看 User；
          <span className="font-mono">ipconfig getifaddr en0</span> 看 IP（更稳）；
          Port 一般是 <span className="font-mono">22</span>。
        </div>

        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">一键复制：Mac 获取信息命令</div>
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-100"
              onClick={() => onCopy(macInfoCmd)}
            >
              复制
            </button>
          </div>
          <div className="mt-2">
            <TextArea
              rows={5}
              value={macInfoCmd}
              readOnly
              className="font-mono text-xs leading-relaxed"
            />
          </div>
          <div className="mt-2 text-slate-500">
            提示：如果 <span className="font-mono">xxx.local</span> 连接不上，就用上面打印出来的
            IP 当 Host。
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <div className="text-xs font-medium text-slate-700">Host</div>
            <Input
              value={config.connection.host}
              onChange={(e) =>
                setConfig({
                  ...config,
                  connection: { ...config.connection, host: e.target.value },
                })
              }
              placeholder="mac.local / 192.168.1.10"
            />
            <div className="mt-1 text-[11px] text-slate-500">
              推荐填 IP（最稳）。同一 Wi‑Fi 下也可以试{" "}
              <span className="font-mono">xxx.local</span>。
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-700">Port</div>
            <Input
              type="number"
              value={config.connection.port}
              onChange={(e) =>
                setConfig({
                  ...config,
                  connection: {
                    ...config.connection,
                    port: Number(e.target.value || 22),
                  },
                })
              }
              placeholder="22"
            />
            <div className="mt-1 text-[11px] text-slate-500">
              一般不改，默认就是 <span className="font-mono">22</span>。
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-700">User</div>
            <Input
              value={config.connection.user}
              onChange={(e) =>
                setConfig({
                  ...config,
                  connection: { ...config.connection, user: e.target.value },
                })
              }
              placeholder="你的账号名"
            />
            <div className="mt-1 text-[11px] text-slate-500">
              就是目标电脑的登录账号短名（Mac 终端运行{" "}
              <span className="font-mono">whoami</span> 看）。
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-slate-700">
              目标端项目根目录（相对家目录）
            </div>
            <Input
              value={config.remote.projectsRoot}
              onChange={(e) =>
                setConfig({
                  ...config,
                  remote: { ...config.remote, projectsRoot: e.target.value },
                })
              }
            />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-700">
              备份根目录（相对家目录）
            </div>
            <Input
              value={config.remote.backupRoot}
              onChange={(e) =>
                setConfig({
                  ...config,
                  remote: { ...config.remote, backupRoot: e.target.value },
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          第 3 步：在目标电脑执行“一次性初始化命令”
        </div>
        <div className="mt-2 text-xs text-slate-500">
          macOS：系统设置里开启“远程登录(SSH)”。然后打开终端粘贴执行下面这段。
          Windows 目标端需要先装/开 OpenSSH Server（相对更折腾）。
        </div>
        <div className="mt-2 text-xs text-slate-500">
          如果你不方便“从 Windows 复制再发给 Mac”，可以点下面的“生成分享链接”：在 Mac 的浏览器打开后复制即可。
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">目标端系统：</span>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="targetOs"
                checked={targetOs === "mac_linux"}
                onChange={() => setTargetOs("mac_linux")}
                className="accent-indigo-600"
              />
              macOS / Linux
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="targetOs"
                checked={targetOs === "windows"}
                onChange={() => setTargetOs("windows")}
                className="accent-indigo-600"
              />
              Windows（谨慎）
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition-all hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-100"
              onClick={() => onCopy(setupScript)}
              disabled={!setupScript}
            >
              复制命令
            </button>
            <button
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-200/70 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              onClick={onShareScript}
              disabled={!setupScript || sharing}
              title="生成一个局域网临时链接，在目标电脑打开即可复制"
            >
              {sharing ? "生成中…" : "生成分享链接"}
            </button>
            {copyHint ? (
              <div className="text-xs text-slate-600">{copyHint}</div>
            ) : null}
          </div>
        </div>

        <div className="mt-3">
          <TextArea
            rows={10}
            value={setupScript}
            readOnly
            className="font-mono text-xs leading-relaxed"
          />
        </div>

        {share ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">在目标电脑打开这个链接</div>
              <div className="text-xs text-slate-500">
                有效期到{" "}
                {(() => {
                  try {
                    return new Date(share.expiresAtMs).toLocaleString();
                  } catch {
                    return String(share.expiresAtMs);
                  }
                })()}
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {share.lanUrl ? (
                <div className="flex gap-2">
                  <Input value={share.lanUrl} readOnly />
                  <button
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
                    onClick={() => onCopy(share.lanUrl ?? "")}
                  >
                    复制链接
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  没找到本机局域网 IP（或网络受限）。你可以先用{" "}
                  <span className="font-mono">{share.localUrl}</span> 在本机测试，或手动把 Windows 的 IP
                  换进去。
                </div>
              )}
              <div className="text-xs text-slate-500">
                提示：如果 Mac 打不开，多半是“没在同一 Wi‑Fi”或 Windows 防火墙拦截了这个端口。
              </div>
            </div>
          </div>
        ) : null}

        {shareErr ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
            生成分享链接失败：{shareErr}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200/70 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          onClick={save}
          disabled={saving}
        >
          保存配置
        </button>

        <button
          className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-100"
          onClick={onTest}
          disabled={testing}
        >
          {testing ? "测试中…" : "测试连接"}
        </button>
      </div>

      {testResult ? (
        <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 text-sm text-slate-800 shadow-sm backdrop-blur">
          {testResult}
        </div>
      ) : null}
    </div>
  );
}
