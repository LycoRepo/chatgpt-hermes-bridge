# ChatGPT ↔ Hermes Bridge

面向 Windows Hermes 的双向协同组合项目。复用开源组件，由本仓库负责配置、任务协调和运行管理。WSL2 保留为 Codex / VS Code Remote 开发环境，Hermes 继续运行在 Windows。

**当前状态：仓库骨架已建立。两个组件的构建与 MCP 工具发现通过；真实双向任务、一键运行脚本、任务锁和专用会话仍待实现。反向 UI 自动化默认关闭。**

## 组件

| 方向 | 组件 | 当前验证 |
|---|---|---|
| 外部客户端 → Windows Hermes | [hermes-action-bridge](https://github.com/TheBlueHouse75/hermes-action-bridge) | 构建、MCP 初始化与工具发现 |
| Hermes → ChatGPT | [chatgpt-escalation-mcp](https://github.com/Dazlarus/chatgpt-escalation-mcp) | 构建、MCP 初始化与工具发现；目标进程识别待修正 |

上游以 Git submodule 固定到已检查的 commit，版本见 [components.lock.json](components.lock.json)。本项目尚未修改上游。

反向组件按 `ChatGPT.exe` 名称终止进程，可能误关同名 Codex 应用。真实调用前必须验证应用身份、窗口识别和启动方式。专用会话不能代替进程身份校验。

## 获取项目

```powershell
git clone --recurse-submodules https://github.com/LycoRepo/chatgpt-hermes-bridge.git
cd chatgpt-hermes-bridge
```

已有克隆：

此仓库目前为私有仓库，克隆需要获得授权的 GitHub 账户。

```powershell
git submodule update --init --recursive
```

Windows 需要 Git、Node.js 20+、已配置的 Hermes CLI。使用 Hermes 的 `hermes.exe` 入口；桌面后台快捷方式用于后台管理，不是任务委派接口。

## 当前可用的仓库操作

```powershell
npm run setup:git
npm run check:components
npm run check:secrets
```

`setup:git` 为当前克隆启用本仓库的提交/推送检查。检查只扫描主仓库 Git 内容，不读取用户凭据或浏览器资料。组件固定版本检查要求 submodule 已初始化。

复制 `.env.example` 为 `.env`、`config/bridge.example.json` 为 `config/bridge.local.json`，在本地填写实际 CLI 路径。模板不会自动修改 Hermes 或 Codex 配置；后续模块会提供生成和安装操作。

## 开发约定

- `main` 保存检查通过的版本，日常工作使用 `feat/*`、`fix/*` 或 `docs/*`。
- 提交配置模板；真实配置、日志、会话引用、凭据及运行时文件保持在 Git 之外。
- 第三方许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。本项目组合层采用 MIT。
- 不直接编辑 submodule；需要改上游时按 [fork 维护说明](docs/fork-maintenance.md) 切换到 fork。

架构见 [architecture.md](docs/architecture.md)，Windows 设置见 [setup-windows.md](docs/setup-windows.md)，远程发布见 [git-workflow.md](docs/git-workflow.md)，当前阶段见 [checkpoints.md](docs/checkpoints.md)。

ChatGPT 普通聊天接入需另行验证 MCP Tunnel 或 HTTPS 接口与账户可用性；Codex 本地 MCP 注册成功不等于 ChatGPT 普通聊天接入成功。
