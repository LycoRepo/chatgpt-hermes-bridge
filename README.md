# ChatGPT ↔ Hermes Bridge

面向 Windows Hermes 的双向协同组合项目。复用开源组件，由本仓库负责配置、任务协调和运行管理。WSL2 保留为 Codex / VS Code Remote 开发环境，Hermes 继续运行在 Windows。

**当前状态：Windows Hermes 真实任务委派已通过。反向组件已 fork 并修正应用身份识别，14 项无界面测试通过，已向上游提交 draft PR。新版 ChatGPT 界面的完整往返尚未验证；反向 UI 自动化继续关闭。一键运行、任务锁和专用会话仍待实现。**

## 组件

| 方向 | 组件 | 当前验证 |
|---|---|---|
| 外部客户端 → Windows Hermes | [hermes-action-bridge](https://github.com/TheBlueHouse75/hermes-action-bridge) | 真实最小任务往返通过 |
| Hermes → ChatGPT | [chatgpt-escalation-mcp fork](https://github.com/LycoRepo/chatgpt-escalation-mcp) | 应用身份修正、构建、14 项测试及 MCP 初始化通过；新版 UI 尚未实测 |

组件以 Git submodule 固定到已检查的 commit，版本见 [components.lock.json](components.lock.json)。escalation 使用自有 fork；原上游、基准版本和 [draft PR #1](https://github.com/Dazlarus/chatgpt-escalation-mcp/pull/1) 均已记录。

原版反向组件按 `ChatGPT.exe` 名称终止进程，可能误关同名 Codex 应用。fork 已改为完整路径识别、默认保留运行应用，并禁止重启新版统一应用。身份修正不代表界面导航、输入和回复提取已兼容；真实调用前仍需完整验证。

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
npm run test:target
npm run check:chatgpt
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

## Windows Hermes 连通探针

先在 `components/hermes-action-bridge` 中执行 `npm ci --ignore-scripts` 和 `npm run build`，再从主仓库运行 `npm run probe:hermes`。探针使用 Windows 已安装 Hermes（可通过本地 `HERMES_COMMAND` 指定），请求返回 `BRIDGE_LINK_OK`，不要求读取文件或执行工具。探针会调用已有推理提供方；只将结果状态写入 Git 忽略的 `.local/probes/`，不保存完整提示或回复。
