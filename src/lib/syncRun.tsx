import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { syncStart, syncStatus } from "./api";
import type { AgentSyncConfig, SyncStatus } from "./types";

type SyncRunContextValue = {
  status: SyncStatus | null;
  refreshing: boolean;
  start: (config: AgentSyncConfig) => Promise<void>;
  refresh: () => Promise<void>;
};

const SyncRunContext = createContext<SyncRunContextValue | null>(null);

export function SyncRunProvider(props: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const p = (async () => {
      setRefreshing(true);
      try {
        const s = await syncStatus();
        setStatus(s);
      } finally {
        setRefreshing(false);
        inFlight.current = null;
      }
    })();
    inFlight.current = p;
    return p;
  }, []);

  const start = useCallback(
    async (config: AgentSyncConfig) => {
      const runId = await syncStart(config);
      setStatus((prev) => ({
        running: true,
        runId,
        startedAtMs: prev?.startedAtMs ?? null,
        endedAtMs: null,
        ok: null,
        totalItems: prev?.totalItems ?? 0,
        doneItems: 0,
        currentLabel: "准备中…",
        lastLine: null,
        error: null,
        items: [],
        summary: null,
      }));
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!status?.running) return;
    const t = window.setInterval(() => {
      void refresh();
    }, 1000);
    return () => window.clearInterval(t);
  }, [status?.running, refresh]);

  const value = useMemo(
    () => ({ status, refreshing, start, refresh }),
    [status, refreshing, start, refresh],
  );

  return <SyncRunContext.Provider value={value}>{props.children}</SyncRunContext.Provider>;
}

export function useSyncRun() {
  const v = useContext(SyncRunContext);
  if (!v) {
    throw new Error("useSyncRun 必须在 SyncRunProvider 内使用");
  }
  return v;
}

