import { useMemo, useState } from "react";
import { useAgentSyncConfig } from "../lib/useAgentSyncConfig";
import { useSyncRun } from "../lib/syncRun";
import type { SyncRunSummary } from "../lib/types";

function SummaryBox(props: { summary: SyncRunSummary }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">
          结果：{props.summary.ok ? "成功" : "失败"}（{props.summary.runId}）
        </div>
        <div className="text-slate-600">
          耗时：
          {Math.max(0, props.summary.endedAtMs - props.summary.startedAtMs)} ms
        </div>
      </div>

      <div className="mt-2 text-slate-700">备份目录：{props.summary.backupRoot}</div>
      <div className="mt-1 text-slate-700">日志文件：{props.summary.logPath}</div>

      <div className="mt-3 space-y-1">
        {props.summary.items.map((it) => (
          <div key={it.label} className="flex items-start gap-2">
            <div className={it.ok ? "text-emerald-700" : "text-rose-700"}>
              {it.ok ? "✓" : "✗"}
            </div>
            <div className="min-w-0">
              <div className="text-slate-900">{it.label}</div>
              <div className="truncate text-xs text-slate-600">{it.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SyncExecutionPage() {
  const { config, isValidForRun } = useAgentSyncConfig();
  const { status, refreshing, start, refresh } = useSyncRun();
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const running = !!status?.running;
  const canRun = isValidForRun && !running;
  const needsConfirm = config.flags.mirrorDelete;

  const percent = useMemo(() => {
    const line = status?.lastLine ?? "";
    const m = line.match(/,\s*(\d{1,3})%\s*,/);
    if (!m) return null;
    const p = Number(m[1]);
    if (!Number.isFinite(p)) return null;
    return Math.min(100, Math.max(0, p));
  }, [status?.lastLine]);

  async function onRun() {
    setErr(null);
    try {
      await start(config);
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">执行同步</div>
        <div className="mt-1 text-sm text-slate-600">
          一次运行会按顺序同步：项目（启用的）→ Codex（可选）→ .agents（可选）。
        </div>
      </div>

      {needsConfirm ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-medium">镜像删除已开启</div>
          <div className="mt-1 leading-relaxed">
            目标端会被覆盖/删除多余文件，最终变得跟源端一致。
            <span className="font-medium">
              但不会直接消失：会被移动到备份目录（按 run_id 分目录）。
            </span>
          </div>
          <label className="mt-3 flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
            />
            <span>我知道这次会删除/覆盖目标端文件，但可以从备份目录找回。</span>
          </label>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
          <div className="font-medium">镜像删除未开启</div>
          <div className="mt-1 leading-relaxed text-slate-700">
            本次不会删除目标端多余文件，但会覆盖同名文件。被覆盖的文件也会先移动到备份目录（按
            run_id 分目录）。
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200/70 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          disabled={!canRun || (needsConfirm && !confirm)}
          onClick={onRun}
          title={needsConfirm && !confirm ? "请先勾选确认" : undefined}
        >
          {running ? "同步中…" : "开始同步"}
        </button>
        <button
          className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-100"
          onClick={() => void refresh()}
          disabled={refreshing}
          title="刷新同步状态"
        >
          {refreshing ? "刷新中…" : "刷新"}
        </button>
      </div>

      {err ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {err}
        </div>
      ) : null}

      {status?.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          同步失败：{status.error}
        </div>
      ) : null}

      {running ? (
        <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 text-sm text-slate-800 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">
              正在同步：{status?.currentLabel ?? "…"}
            </div>
            <div className="font-mono text-xs text-slate-600">
              {status?.doneItems ?? 0}/{status?.totalItems ?? 0}
            </div>
          </div>

          <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-indigo-500 transition-all"
              style={{
                width:
                  status?.totalItems && status.totalItems > 0
                    ? `${Math.round(
                        (status.doneItems / status.totalItems) * 100,
                      )}%`
                    : percent != null
                      ? `${percent}%`
                      : "20%",
              }}
            />
          </div>

          <div className="mt-3 text-xs text-slate-600">
            小提示：你可以切到别的选项卡继续看别的内容，同步不会中断。
          </div>

          {status?.lastLine ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 font-mono text-[11px] text-slate-700">
              {status.lastLine}
            </div>
          ) : null}
        </div>
      ) : null}

      {status?.summary ? <SummaryBox summary={status.summary} /> : null}
    </div>
  );
}
