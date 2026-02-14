# AgentSync

一个跨平台（Windows / macOS / Linux）的“单向同步工具”：
在**源电脑**点“一键同步”，通过 SSH（SFTP）把你选中的内容推到**目标电脑**。

## 现在已经能做什么（MVP）

- 桌面界面（Tauri + React）
- 配置 SSH 连接（Host / Port / User / 私钥路径）
- 选择要同步的项目文件夹（可多个）
- 可选同步：
  - Codex：只同步 `config.toml` + `sessions/`
  - `.agents`：同步 `~/.agents`
- 默认“镜像同步”（会删除目标端多余文件、覆盖不同文件）
  - 但不会直接消失：会移动到备份目录 `AgentSync/.agentsync-backup/<run_id>/...`
- 运行历史与日志：
  - 本机：`~/.agentsync/history.jsonl`
  - 本机：`~/.agentsync/logs/*.log`

## 运行开发版

前提（大白话）：
- 你需要能编译 Tauri（不同系统有各自依赖）
- 你需要装 `rclone`（同步真正靠它跑）

1) 安装依赖
```bash
npm install
```

2) 启动开发模式
```bash
npm run tauri dev
```

## 使用建议（第一次跑通）

最省心的方式：先跑一遍 **“设备向导（SSH 模式）”**。

1) 在目标电脑（macOS）打开 SSH（系统设置里开启“远程登录/Remote Login”）
2) 在源电脑安装 `rclone` 并确保命令行能跑通 `rclone version`
3) 打开 AgentSync → “设备向导”：
   - 一键生成/选择 SSH 密钥（并拿到公钥）
   - 复制“目标端初始化命令”
   - （可选）点“生成分享链接”，在 Mac 用浏览器打开后复制
4) 在目标电脑终端粘贴执行一次初始化命令（会写入 `authorized_keys` + 创建目录）
5) 回到源电脑点“测试连接”通过后：去“同步项”选项目文件夹，最后去“执行同步”开始同步

## 目录结构

- 前端：`src/`
- Tauri 后端（Rust）：`src-tauri/`
- 知识库与方案：`helloagents/`
- 参考资料：`reference/`
