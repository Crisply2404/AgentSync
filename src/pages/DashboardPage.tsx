import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { runsList } from "../lib/api";
import { useAgentSyncConfig } from "../lib/useAgentSyncConfig";
import type { RunRecord } from "../lib/types";

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        {props.title}
      </div>
      <div className="mt-3 text-sm text-slate-700">{props.children}</div>
    </div>
  );
}

export function DashboardPage() {
  const nav = useNavigate();
  const { loading, error, isValidForRun } = useAgentSyncConfig();
  const [latest, setLatest] = useState<RunRecord | null>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const runs = await runsList();
        if (canceled) return;
        setLatest(runs[0] ?? null);
      } catch {
        if (canceled) return;
        setLatest(null);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  const canRun = !loading && isValidForRun;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">总览</div>
        <div className="mt-1 text-sm text-slate-600">
          先把“连接设置”和“同步项”配好，然后点一键同步。
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          读取配置失败：{error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="最近一次同步">
          {latest ? (
            <div className="space-y-2">
              <div>
                结果：{latest.ok ? "成功" : "失败"}（{latest.runId}）
              </div>
              <div>
                耗时：{Math.max(0, latest.endedAtMs - latest.startedAtMs)} ms
              </div>
              <div>备份目录：{latest.backupRoot}</div>
            </div>
          ) : (
            <div className="text-slate-500">还没有同步记录</div>
          )}
        </Card>

        <Card title="一键同步">
          <div className="space-y-3">
            <div className="text-slate-600">
              默认是镜像同步：目标端会被覆盖/删除多余文件，但会放进备份目录。
            </div>
            <button
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:bg-white active:scale-[0.98]"
              onClick={() => nav("/device-setup")}
            >
              第一次用？先跑设备向导
            </button>
            <button
              className={[
                "w-full rounded-2xl px-4 py-4 text-base font-bold shadow-lg transition-all active:scale-[0.98]",
                canRun
                  ? "bg-indigo-600 text-white shadow-indigo-200/70 hover:bg-indigo-700"
                  : "cursor-not-allowed bg-slate-200 text-slate-500 shadow-none",
              ].join(" ")}
              onClick={() => nav("/sync")}
              disabled={!canRun}
              title={
                canRun ? undefined : "请先完成连接设置（Host/User/Key/目标目录）"
              }
            >
              一键同步
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
