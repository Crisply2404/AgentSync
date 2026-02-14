import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useMemo } from "react";
import { useAgentSyncConfig } from "../lib/useAgentSyncConfig";
import type { ProjectItem } from "../lib/types";

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

function lastSegment(path: string) {
  const trimmed = path.replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || "project";
}

function Toggle(props: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:bg-white">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-indigo-600"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <div>
        <div className="text-sm font-medium">{props.label}</div>
        {props.hint ? (
          <div className="mt-0.5 text-xs text-slate-500">{props.hint}</div>
        ) : null}
      </div>
    </label>
  );
}

export function SyncItemsPage() {
  const { config, setConfig, save, saving } = useAgentSyncConfig();

  const excludesText = useMemo(() => config.excludes.join("\n"), [config]);

  async function addProject() {
    const selected = await openDialog({
      multiple: false,
      directory: true,
      title: "选择要同步的项目文件夹",
    });
    if (typeof selected !== "string") return;

    const name = lastSegment(selected);
    const item: ProjectItem = {
      id: crypto.randomUUID(),
      name,
      localPath: selected,
      remoteDirName: name,
      enabled: true,
    };

    setConfig({ ...config, projects: [...config.projects, item] });
  }

  function updateProject(id: string, patch: Partial<ProjectItem>) {
    setConfig({
      ...config,
      projects: config.projects.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    });
  }

  function removeProject(id: string) {
    setConfig({
      ...config,
      projects: config.projects.filter((p) => p.id !== id),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">同步项</div>
        <div className="mt-1 text-sm text-slate-600">
          这里决定“同步哪些东西”。项目是你点选的文件夹；Codex 和 .agents
          是可选开关。
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Toggle
            checked={config.flags.syncCodex}
            onChange={(v) =>
              setConfig({
                ...config,
                flags: { ...config.flags, syncCodex: v },
              })
            }
            label="同步 Codex（config + 聊天记录）"
            hint="会同步 config.toml 和 sessions/；登录信息建议在目标端重新登录"
          />
          <Toggle
            checked={config.flags.syncAgents}
            onChange={(v) =>
              setConfig({
                ...config,
                flags: { ...config.flags, syncAgents: v },
              })
            }
            label="同步 .agents（技能/工具配置）"
            hint="会把本机 ~/.agents 推到目标端 ~/.agents"
          />
          <Toggle
            checked={config.flags.mirrorDelete}
            onChange={(v) =>
              setConfig({
                ...config,
                flags: { ...config.flags, mirrorDelete: v },
              })
            }
            label="镜像删除（目标端变得跟源端一致）"
            hint="开启后会删除目标端多余文件（但会先移到备份目录）"
          />
        </div>

        <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            排除规则（只用于项目同步）
          </div>
          <div className="mt-2 text-xs text-slate-500">
            一行一个规则。常见的 node_modules/dist/build 等建议排除掉。
          </div>
          <div className="mt-3">
            <TextArea
              rows={10}
              value={excludesText}
              onChange={(e) =>
                setConfig({
                  ...config,
                  excludes: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              项目列表
            </div>
            <div className="mt-1 text-xs text-slate-500">
              远端目录名默认用文件夹名字；如果两个项目同名，记得改一下避免覆盖。
            </div>
          </div>
          <button
            className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200/70 transition-all hover:bg-indigo-700 active:scale-[0.98]"
            onClick={addProject}
          >
            添加项目
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {config.projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              还没有项目。点“添加项目”选一个文件夹就行。
            </div>
          ) : null}

          {config.projects.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="truncate text-xs text-slate-500">
                    {p.localPath}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-indigo-600"
                      checked={p.enabled}
                      onChange={(e) =>
                        updateProject(p.id, { enabled: e.target.checked })
                      }
                    />
                    启用
                  </label>
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => removeProject(p.id)}
                  >
                    删除
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-slate-700">
                    远端目录名
                  </div>
                  <Input
                    value={p.remoteDirName}
                    onChange={(e) =>
                      updateProject(p.id, { remoteDirName: e.target.value })
                    }
                    placeholder="例如 my-project"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <button
            className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200/70 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            onClick={save}
            disabled={saving}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
