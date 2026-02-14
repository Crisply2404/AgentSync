# 任务清单: SSH 一键向导（目标端免安装）

目录: `helloagents/plan/202602141204_ssh_setup_wizard/`

---

## 1. 后端（Tauri / Rust）
- [√] 1.1 新增 `ssh_keypair_ensure` command：生成/复用 `~/.agentsync/keys/agentsync_ed25519`
- [√] 1.2 新增 `ssh_public_key_read` command：从私钥路径读取公钥（支持 `*.pub` 或 `ssh-keygen -y`）
- [√] 1.3 更新 `helloagents/wiki/api.md`：补充上述 commands

## 2. 前端（React）
- [√] 2.1 新增“设备向导”页面：引导 SSH 模式配置（生成密钥/显示公钥/生成初始化命令）
- [√] 2.2 菜单新增入口，并补充提示文案（目标端免安装、需要开启 SSH）
- [√] 2.3 修正“镜像删除”提示：跟随开关显示（避免用户关闭后仍显示已开启）

## 3. 安全检查
- [√] 3.1 检查：不保存密码/不回传私钥/命令注入风险（生成脚本需做基本转义）

## 4. 文档更新
- [√] 4.1 更新 `README.md`：推荐先走“设备向导”跑通
- [√] 4.2 更新 `helloagents/wiki/modules/ui.md` 与 `helloagents/wiki/modules/config.md`
- [√] 4.3 更新 `helloagents/CHANGELOG.md`

## 5. 验证
- [√] 5.1 执行 `npm run build`
- [√] 5.2 执行 `cargo check`（在 `src-tauri/`）
