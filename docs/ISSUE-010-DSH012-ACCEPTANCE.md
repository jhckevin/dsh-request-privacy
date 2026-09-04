# ISSUE-010：DSH 0.1.2-rc.1 适配与发布前验收

日期：2026-09-04。候选：0.4.0-rc.1。本文保留适配时的验收事实；最终发布范围见 [RELEASE-040.md](RELEASE-040.md)。

## 已实现

- 固定官方及镜像共同确认的 latest：0.1.2-rc.1。
- 迁移旧 client-runtime 到原生 Cordis Context / client-modules / ui-renderer。
- 使用原生 settings.installSection；迁移 ToolCallId 与 util-values。
- 使用原生 attributionHeaders 的自定义应用身份参数；保留鉴权，省略可选关联字段。
- 独立 worktree 开发，未修改旧插件或生产服务。

## 验收证据

- 构建成功；12/12 自动化测试通过。
- 真实 DeepSeek V4 Flash：聊天、compaction、session-title 各一次；全部 HTTP 200，finish=stop。
- 三次总计 inputTokens=48，outputTokens=6；每次 User-Agent=private-client/0.4.0-rc.1，三个 Harness 关联请求头均不存在。
- 实测是 adapter 出站边界，不是整个 Agent 任务或服务商内部数据留存证明；用户文本不被隐私插件删除。
- 实验使用合成消息，日志不记录 API key、鉴权头或用户聊天内容。

## 原生包热发现的已知边界

原生 DSH 进程启动后执行 dsh plugin add，包与 profile bundle 列表已更新，PID 不变，但鉴权后返回的页面 boot graph 不包含 dsh-request-privacy。

保持同一安装内容，正常停止测试实例后冷启动：HTTP 200，boot graph 包含 dsh-request-privacy，日志没有加载错误。

已核对发布包 profile-boot：运行中 watchUserPatches 仅监听 profile.patchPath 和 homePatchPath，并未重新订阅 package.json 中新增的 bundle 列表。因此不能以该版本当前实测声称“首次热安装后立即热启动”。

用户已明确选择遵循官方安装后启动／重启流程，不把全链路无重启安装作为本次发布目标。因此保留这一边界，不增加宿主补丁，不发布“完全热插拔”保证。现有 Cordis 服务级卸载/重挂测试与包级热发现分别记录，不能混同。
