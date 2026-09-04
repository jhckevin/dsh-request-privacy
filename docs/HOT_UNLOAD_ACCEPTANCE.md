# Cordis 热关闭与卸载验收

日期：2026-08-18

平台：Linux x86_64，DeepSeek Harness Web profile

资源边界：1 CPU、512 MiB、仅回环端口、测试容器无 OOM

## 验收序列

在同一个 DSH 容器进程（宿主 PID `3695645`）中执行：

1. 加载 `dsh-request-privacy`，WebUI 出现 1 个“请求隐私”入口；
2. 在 profile `cordis.patch.yml` 中把 `request-privacy-bundle` 设为 `disabled: true`；
3. HMR 后进程 PID 不变，入口数量变为 0；
4. 删除 disable 覆盖，PID 不变，入口数量恢复为 1；
5. 再次热关闭，入口数量变为 0；
6. 执行 `dsh plugin --profile web remove dsh-request-privacy`，包目录与 profile dependency 均移除，运行中 PID 仍不变。

浏览器控制台在热关闭、恢复和最终删除后均没有新增 error。容器 `OOMKilled=false`、`RestartCount=0`。

## 资源释放覆盖

- adapter 生命周期信号会取消在途 HTTP/SSE、reader 和 watchdog；
- Cordis group dispose 会释放 provider route、configurable-provider directory、settings namespace、Remote service 与 system-prompt listener；
- Web Client 会取消未完成的探测/设置 RPC，并根据 `llm/adapters-updated` 动态撤下或恢复 settings slot；
- dispose 后可在同一 Context 中重新 mount，provider 和 Remote service 均只有一个实例。

## Harness 边界

`dsh plugin remove` 本身不保证运行中的 Web 进程重新执行 package/client discovery，因此正式卸载必须先热关闭 `request-privacy-bundle`。浏览器已加载的静态 JS、词典和 CSS 由启动期 client discovery 管理；热关闭会使入口与 RPC 失活，但静态模块的最终内存回收需要刷新页面，包升级或最终清理建议重启 profile。
