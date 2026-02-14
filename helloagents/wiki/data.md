# 数据模型

## 概述

MVP 主要就是两类数据：
1) **配置**：你要同步什么、同步到哪台电脑、排除规则等  
2) **运行记录**：每次同步的开始时间、结果、日志路径等

---

## 配置（建议 JSON）

建议路径：`~/.agentsync/config.json`

大白话字段解释：
- `host/port/user`：目标电脑 SSH 信息
- `keyPath`：SSH 私钥文件在“源电脑”的路径
- `remoteProjectsRoot`：目标电脑上用来放项目的根目录（相对家目录），例如 `AgentSync/projects`
- `syncCodex/syncAgents`：是否同步 `.codex` / `.agents`
- `projects[]`：你点选的项目文件夹列表
- `excludes[]`：默认不传的目录/文件（比如 `node_modules`）

（具体字段名最终以代码为准，这里先当“设计草稿”。）

---

## 运行历史

建议路径：`~/.agentsync/history.jsonl`

每行一条记录（JSONL），大概包含：
- 时间
- 同步了哪些项目/开关
- 成功/失败
- 日志文件路径

