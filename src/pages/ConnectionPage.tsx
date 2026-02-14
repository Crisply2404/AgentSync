import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { connectionTest } from "../lib/api";
import { useAgentSyncConfig } from "../lib/useAgentSyncConfig";

function Field(props: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-slate-900">{props.label}</div>
      {props.hint ? (
        <div className="text-xs text-slate-500">{props.hint}</div>
      ) : null}
      {props.children}
    </div>
  );
}

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

export function ConnectionPage() {
  const { config, setConfig, saving, save, error, setError } =
    useAgentSyncConfig();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

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

  async function pickRclone() {
    const selected = await openDialog({
      multiple: false,
      directory: false,
      title: "选择 rclone 可执行文件（可选）",
    });
    if (typeof selected === "string") {
      setConfig({ ...config, rclonePath: selected });
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

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">连接设置</div>
        <div className="mt-1 text-sm text-slate-600">
          这里填目标电脑的 SSH 信息。建议用密钥登录，不要在工具里存密码。
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            SSH 信息
          </div>
          <div className="mt-4 space-y-4">
            <Field label="Host" hint="例如：192.168.1.10 或 mac.local">
              <Input
                value={config.connection.host}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    connection: { ...config.connection, host: e.target.value },
                  })
                }
                placeholder="mac.local"
              />
            </Field>

            <Field label="Port">
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
            </Field>

            <Field label="User" hint="目标电脑用户名（一般就是你的账号名）">
              <Input
                value={config.connection.user}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    connection: { ...config.connection, user: e.target.value },
                  })
                }
                placeholder="yourname"
              />
            </Field>

            <Field label="SSH 私钥文件路径">
              <div className="flex gap-2">
                <Input value={config.connection.keyPath} readOnly />
                <button
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={pickKeyFile}
                >
                  选择
                </button>
              </div>
            </Field>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            同步目标目录
          </div>
          <div className="mt-4 space-y-4">
            <Field
              label="目标端项目根目录（相对目标端家目录）"
              hint="不建议写 ~，直接写相对路径就行，比如 AgentSync/projects"
            >
              <Input
                value={config.remote.projectsRoot}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    remote: { ...config.remote, projectsRoot: e.target.value },
                  })
                }
              />
            </Field>

            <Field
              label="备份根目录（相对目标端家目录）"
              hint="镜像删除/覆盖的文件会被移动到这里，方便找回"
            >
              <Input
                value={config.remote.backupRoot}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    remote: { ...config.remote, backupRoot: e.target.value },
                  })
                }
              />
            </Field>

            <Field label="rclone 可执行文件（可选）" hint="不填就走 PATH 里的 rclone">
              <div className="flex gap-2">
                <Input value={config.rclonePath ?? ""} readOnly />
                <button
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={pickRclone}
                >
                  选择
                </button>
              </div>
            </Field>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200/70 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          onClick={save}
          disabled={saving}
        >
          保存
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
          {testResult}
        </div>
      ) : null}
    </div>
  );
}
