# Changelog

本文件记录项目所有重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增
- 桌面应用骨架（Tauri + React + TypeScript）
- 基础 UI（侧边栏导航 + 总览/连接设置/同步项/执行同步/历史日志）
- 设备向导（SSH 模式）：一键生成密钥 + 生成目标端初始化命令
- 本机配置读写（`~/.agentsync/config.json`）
- rclone(SFTP) 连接测试与一键同步（默认镜像删除 + 备份目录）
- 运行历史与日志（`~/.agentsync/history.jsonl` + `~/.agentsync/logs/*.log`）

### 变更
- UI 视觉对齐原型：顶部 Tab 导航、卡片样式（更圆、更柔和）、主色 indigo、滚动条样式
- 设备向导补齐“Host/Port/User 怎么获取”的指引，并提供可复制的 Mac 终端命令
- 输入框/文本框：去掉粗体，默认就有白底+圆角边框（更自然）
- 设备向导：支持生成“局域网分享链接”，方便在目标电脑打开后复制命令
