import type { AgentSyncConfig } from "./types";

export function defaultConfig(): AgentSyncConfig {
  return {
    schemaVersion: 1,
    rclonePath: null,
    connection: {
      host: "",
      port: 22,
      user: "",
      keyPath: "",
    },
    remote: {
      projectsRoot: "AgentSync/projects",
      backupRoot: "AgentSync/.agentsync-backup",
    },
    flags: {
      mirrorDelete: true,
      syncCodex: true,
      syncAgents: true,
    },
    excludes: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".venv/**",
      ".git/**",
      ".DS_Store",
    ],
    projects: [],
  };
}

