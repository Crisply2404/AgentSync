# 架构设计

## 总体架构（MVP）

```mermaid
flowchart TD
    UI[桌面界面\nTauri + React] --> Core[本地核心逻辑\nTauri Commands]
    Core --> Rclone[rclone CLI]
    Rclone -->|SFTP| Remote[目标电脑文件系统]
    UI -->|读取/写入| LocalCfg[本机配置与日志\n~/.agentsync/]
    Core -->|读取| LocalCfg
```

## 技术栈
- **桌面壳:** Tauri
- **前端:** React + TypeScript（Vite）
- **同步:** rclone（SFTP）

## 核心流程（一次同步）

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 桌面界面
    participant Core as 本地核心逻辑
    participant R as rclone
    participant Remote as 目标电脑

    User->>UI: 点击“一键同步”
    UI->>Core: 读取配置/校验
    Core->>R: 逐项执行 rclone sync
    R->>Remote: 上传/覆盖/镜像删除（带备份）
    R-->>Core: 输出日志/进度
    Core-->>UI: 同步结果摘要
```

## 重大架构决策

完整 ADR 记录在每次变更的 `how.md` 中；本表提供索引（MVP 完成后会补充链接到 history）。

| adr_id | title | date | status | affected_modules | details |
|--------|-------|------|--------|------------------|---------|
| ADR-001 | 使用 rclone 做同步 | 2026-02-14 | ✅已采纳 | Sync Engine | 见 ../history/2026-02/202602140515_agentsync_mvp/how.md |
| ADR-002 | 使用 Tauri 做桌面壳 | 2026-02-14 | ✅已采纳 | UI | 见 ../history/2026-02/202602140515_agentsync_mvp/how.md |
| ADR-003 | 默认镜像删除但必须备份 | 2026-02-14 | ✅已采纳 | Sync Engine | 见 ../history/2026-02/202602140515_agentsync_mvp/how.md |
