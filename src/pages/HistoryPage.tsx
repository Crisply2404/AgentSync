import { openPath } from "@tauri-apps/plugin-opener";
import { useEffect, useMemo, useState } from "react";
import { runLogRead, runsList } from "../lib/api";
import type { RunRecord } from "../lib/types";

function msToLocal(ms: number) {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

export function HistoryPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logText, setLogText] = useState<string>("");
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const list = await runsList();
        if (canceled) return;
        setRuns(list);
        setSelectedId(list[0]?.runId ?? null);
        setErr(null);
      } catch (e) {
        if (canceled) return;
        setErr(String(e));
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    let canceled = false;
    (async () => {
      if (!selectedId) return;
      try {
        const t = await runLogRead(selectedId);
        if (canceled) return;
        setLogText(t);
      } catch (e) {
        if (canceled) return;
        setLogText("");
        setErr(String(e));
      }
    })();
    return () => {
      canceled = true;
    };
  }, [selectedId]);

  const selected = useMemo(
    () => runs.find((r) => r.runId === selectedId) ?? null,
    [runs, selectedId],
  );

  const filteredLog = useMemo(() => {
    const query = q.trim();
    if (!query) return logText;
    return logText
      .split("\n")
      .filter((line) => line.toLowerCase().includes(query.toLowerCase()))
      .join("\n");
  }, [logText, q]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">历史 / 日志</div>
        <div className="mt-1 text-sm text-slate-600">
          每次同步都会写一份日志，方便排查失败原因，也能看到备份目录在哪。
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {err}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur md:col-span-1">
          <div className="px-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
            运行列表
          </div>
          <div className="mt-3 space-y-2">
            {runs.length === 0 ? (
              <div className="text-sm text-slate-500">暂无记录</div>
            ) : null}
            {runs.map((r) => (
              <button
                key={r.runId}
                className={[
                  "w-full rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition-all",
                  r.runId === selectedId
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200/70"
                    : "border-slate-200 bg-white/80 hover:bg-white",
                ].join(" ")}
                onClick={() => setSelectedId(r.runId)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{r.ok ? "成功" : "失败"}</div>
                  <div className="text-xs opacity-80">{r.runId}</div>
                </div>
                <div className="mt-1 text-xs opacity-80">
                  {msToLocal(r.startedAtMs)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              日志内容
            </div>
            {selected?.logPath ? (
              <button
                className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition-all hover:bg-white active:scale-[0.98]"
                onClick={() => openPath(selected.logPath)}
              >
                打开日志文件
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-200"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索日志关键字（例如 permission denied）"
            />
          </div>

          <pre className="mt-3 max-h-[520px] overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
            {filteredLog || "（暂无日志）"}
          </pre>

          {selected ? (
            <div className="mt-3 text-xs text-slate-600">
              备份目录：{selected.backupRoot}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
