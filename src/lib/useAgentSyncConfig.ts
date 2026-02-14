import { useCallback, useEffect, useMemo, useState } from "react";
import { configGet, configSave } from "./api";
import { defaultConfig } from "./defaults";
import type { AgentSyncConfig } from "./types";

export function useAgentSyncConfig() {
  const [config, setConfig] = useState<AgentSyncConfig>(defaultConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const loaded = await configGet();
        if (canceled) return;
        setConfig(loaded);
        setError(null);
      } catch (e) {
        if (canceled) return;
        setError(String(e));
      } finally {
        if (canceled) return;
        setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  const isValidForRun = useMemo(() => {
    return (
      config.connection.host.trim().length > 0 &&
      config.connection.user.trim().length > 0 &&
      config.connection.keyPath.trim().length > 0 &&
      config.remote.projectsRoot.trim().length > 0
    );
  }, [config]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await configSave(config);
      setError(null);
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [config]);

  return {
    config,
    setConfig,
    loading,
    saving,
    error,
    setError,
    isValidForRun,
    save,
  };
}

