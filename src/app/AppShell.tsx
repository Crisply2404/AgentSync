import { NavLink } from "react-router-dom";
import { useAgentSyncConfig } from "../lib/useAgentSyncConfig";
import { useSyncRun } from "../lib/syncRun";

function TabLink(props: { to: string; label: string }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        [
          "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
          isActive
            ? "bg-white text-indigo-600 shadow-sm"
            : "text-slate-500 hover:bg-white/60 hover:text-slate-700",
        ].join(" ")
      }
      end={props.to === "/"}
    >
      {props.label}
    </NavLink>
  );
}

export function AppShell(props: { children: React.ReactNode }) {
  const { loading, isValidForRun } = useAgentSyncConfig();
  const { status: syncStatus } = useSyncRun();
  const status = loading ? "读取中" : isValidForRun ? "已准备" : "未配置";
  const dotClass = loading
    ? "bg-slate-300"
    : isValidForRun
      ? "bg-emerald-500"
      : "bg-amber-500";

  return (
    <div className="flex h-full flex-col bg-violet-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold tracking-tight">AgentSync</div>
              <div className="text-[11px] text-slate-500">
                一键把东西推到另一台电脑
              </div>
            </div>
          </div>

          <nav className="hidden items-center rounded-xl bg-slate-100/80 p-1 sm:flex">
            <TabLink to="/" label="传送" />
            <TabLink to="/device-setup" label="向导" />
            <TabLink to="/sync-items" label="内容" />
            <TabLink to="/connection" label="目标" />
            <TabLink to="/history" label="历史" />
          </nav>

          <div className="flex items-center gap-2">
            {syncStatus?.running ? (
              <NavLink
                to="/sync"
                className="hidden items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm sm:flex"
              >
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-600" />
                同步中
                <span className="font-mono text-[11px] text-indigo-600/80">
                  {syncStatus.doneItems}/{syncStatus.totalItems || "?"}
                </span>
              </NavLink>
            ) : null}
            <div className={["h-2 w-2 rounded-full", dotClass].join(" ")} />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              {status}
            </span>
          </div>
        </div>

        <div className="px-4 pb-3 sm:hidden">
          <nav className="flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1">
            <TabLink to="/" label="传送" />
            <TabLink to="/device-setup" label="向导" />
            <TabLink to="/sync-items" label="内容" />
            <TabLink to="/connection" label="目标" />
            <TabLink to="/history" label="历史" />
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-3xl">{props.children}</div>
      </main>
    </div>
  );
}
