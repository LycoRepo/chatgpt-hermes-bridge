# ChatGPT ↔ Hermes Bridge

面向 Windows Hermes 的双向协同组合项目。复用开源组件，由本仓库负责配置、任务协调和运行管理。WSL2 保留为 Codex / VS Code Remote 开发环境，Hermes 继续运行在 Windows。

**当前状态：任务协调层、本地 MCP 接口、一键安装/配置/启动/停止/doctor 已实现。Windows 和 WSL 接入 Windows Hermes 的真实往返通过。反向组件的身份修正已提交上游 draft PR。新版应用中的专用会话绑定、自动接收和完整双向往返仍待验证；反向 UI 自动化保持关闭。**

## 组件

| 方向 | 组件 | 当前验证 |
|---|---|---|
| 外部客户端 → Windows Hermes | [hermes-action-bridge](https://github.com/TheBlueHouse75/hermes-action-bridge) | 真实最小任务往返通过 |
| Hermes → ChatGPT | [chatgpt-escalation-mcp fork](https://github.com/LycoRepo/chatgpt-escalation-mcp) | 应用身份修正、构建、14 项测试及 MCP 初始化通过；新版 UI 尚未实测 |

组件以 Git submodule 固定到已检查的 commit，版本见 [components.lock.json](components.lock.json)。escalation 使用自有 fork；原上游、基准版本和 [draft PR #1](https://github.com/Dazlarus/chatgpt-escalation-mcp/pull/1) 均已记录。

原版反向组件按 `ChatGPT.exe` 名称终止进程，可能误关同名 Codex 应用。fork 已改为完整路径识别、默认保留运行应用，并禁止重启新版统一应用。身份修正不代表界面导航、输入和回复提取已兼容；真实调用前仍需完整验证。

## 获取项目

```powershell
git clone --branch feat/windows-link-validation --recurse-submodules https://github.com/LycoRepo/chatgpt-hermes-bridge.git
cd chatgpt-hermes-bridge
```

已有克隆：

实现目前位于 `feat/windows-link-validation` 检查点分支，尚未合并到 `main`。已有克隆先切换到该分支，再初始化组件。

此仓库目前为私有仓库，克隆需要获得授权的 GitHub 账户。

```powershell
git submodule update --init --recursive
```

Windows 需要 Git、Node.js 20+、已配置的 Hermes CLI。使用 Hermes 的 `hermes.exe` 入口；桌面后台快捷方式用于后台管理，不是任务委派接口。

## 安装与运行

```powershell
npm run setup
npm run connect:codex
npm run doctor
```

安装会初始化固定组件、按锁文件安装依赖并构建 action 组件，生成被 Git 忽略的本机配置和 VS Code MCP 文件。`connect:codex` 备份已有配置，只注册本项目的 `hermes_bridge` 入口；已有同名但不同来源的入口会报冲突。应用/扩展重载后才会重新发现工具，脚本不会主动重载窗口。

本地 stdio 接入由客户端按需启动，无需常驻 HTTP 服务。需要后台 HTTP 时使用 `npm start`，检查使用 `npm run doctor`，停止使用 `npm stop`。它只监听 `127.0.0.1`，要求本地生成的鉴权令牌；有任务执行时拒绝停止。详见 [Windows / WSL 设置](docs/setup-windows.md)。

## 当前可用的仓库操作

```powershell
npm run setup:git
npm run check:components
npm run check:secrets
npm test
npm run check:chatgpt
```

`setup:git` 为当前克隆启用本仓库的提交/推送检查。检查只扫描主仓库 Git 内容，不读取用户凭据或浏览器资料。组件固定版本检查要求 submodule 已初始化。

本机配置由 `npm run setup` 生成，重复安装保留现有 `config/bridge.local.json`。程序读取这份本地 JSON；`.env.example` 仅列出环境变量，不会自动加载 `.env`。本轮没有安装或修改 Hermes 的反向工具配置。

运行测试前先执行 `npm run setup`。本地 stdio 工具入口为 `node scripts/mcp.mjs chatgpt`，提供规划委派；`connect:codex` 单独负责注册。任务协调、三种工具角色和专用会话待验边界见 [coordinator.md](docs/coordinator.md)。

## 开发约定

- `main` 保存检查通过的版本，日常工作使用 `feat/*`、`fix/*` 或 `docs/*`。
- 提交配置模板；真实配置、日志、会话引用、凭据及运行时文件保持在 Git 之外。
- 第三方许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。本项目组合层采用 MIT。
- 不直接编辑 submodule；需要改上游时按 [fork 维护说明](docs/fork-maintenance.md) 切换到 fork。

架构见 [architecture.md](docs/architecture.md)，Windows 设置见 [setup-windows.md](docs/setup-windows.md)，远程发布见 [git-workflow.md](docs/git-workflow.md)，当前阶段见 [checkpoints.md](docs/checkpoints.md)。

新版桌面应用的本地 MCP 配置可与 Codex/IDE 共享，但当前具体会话仍需重载后验证。云端 ChatGPT 接入需另行验证 HTTPS 或 MCP Tunnel 与账户可用性；本地 MCP 注册成功不等于云端聊天接入成功。

## Windows Hermes 连通探针

先在 `components/hermes-action-bridge` 中执行 `npm ci --ignore-scripts` 和 `npm run build`，再从主仓库运行 `npm run probe:hermes`。探针使用 Windows 已安装 Hermes（可通过本地 `HERMES_COMMAND` 指定），请求返回 `BRIDGE_LINK_OK`，不要求读取文件或执行工具。探针会调用已有推理提供方；只将结果状态写入 Git 忽略的 `.local/probes/`，不保存完整提示或回复。
