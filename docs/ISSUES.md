# 实施 ISSUE

## ISSUE-001：建立隐私边界与上游兼容约束

状态：完成。

定义只处理应用归因和可选请求关联字段，不修改认证、模型参数、提示词、工具调用、消息正文或业务 metadata。禁止冒充任何已知第三方客户端；中性身份只能是 `private-client`。适配器继续发送符合 HTTP 标准的非空 `User-Agent`，以满足上游适配器契约。

## ISSUE-002：实现独立 DeepSeek 隐私路由

状态：完成。

新增 `deepseek-private` provider 路由。默认将应用身份替换为 `private-client`，并省略可选的用户、会话与压缩分类标头。请求变换使用精确白名单，未知字段保持不变并拒绝重定向。

## ISSUE-003：实现 WebUI 设置选项卡

状态：完成。

新增“请求隐私”设置页，支持启停、预览实际出站标头、查看被省略字段与保存状态。浏览器端只访问本扩展的受限 Remote，不暴露 API key、主机路径或任意设置命名空间。

## ISSUE-004：建立打包、组合与浏览器验收门禁

状态：完成。

覆盖普通与压缩请求的字段级捕获、禁用 fail-closed、重定向拒绝、真实 Cordis 组合、packed artifact 导入和浏览器交互。真实 WebUI 验收验证了开关保存、刷新持久化、恢复默认值和无新控制台错误。组合验收先后发现并修复了设置桥循环导入与未作为独立 Cordis 插件注册两个问题。

## ISSUE-005：发布 0.1.0

状态：发布资料完成，远程发布待认证。

完成中英双语说明、隐私边界、第三方许可证、变更日志和公开仓库发布。文档必须明确：本扩展减少客户端主动发送的可选标识，但不能承诺或控制提供方的数据保留、分析或训练政策。

## ISSUE-006：端到端请求去品牌化与 WebUI 可读性

状态：完成。

修复深色主题下白色保存按钮的文字对比度。通过原生 `system-prompt/assemble` waterfall 精确移除三个 Harness 自有产品身份段，不扫描或改写用户消息。使用隔离 Docker 网络、真实 Web/API 网关、独立 HTTP 捕获端和禁用门禁验证头部与请求体均不再包含 Harness 自有身份。

## ISSUE-007：精简设置文案与身份状态可视化

状态：完成。

删除设置页中与操作无关的限制性、解释性文字，保留配置项和实际出站预览。使用绿色“当前配置：已覆盖”和红色“当前配置：原生”状态灯替换原配置来源文字；状态由服务端 `overridden` 快照驱动，并验证保存与恢复默认值后实时切换。

## ISSUE-008：公开组合包命名与发行文档

状态：完成。

将包名从个人 scope 迁移为符合官方前缀约定的 `dsh-request-privacy`，补充 `dsh.bundle` 分类、GitHub 源码构建入口、tarball/GitHub/本地 checkout 三种加载方式、卸载和配置验证步骤，并把真实 WebUI 验收截图纳入中英双语 README。

## ISSUE-009：Cordis 热关闭、热卸载与资源释放

状态：完成。

将 provider、设置 Remote 与 prompt hook 放入稳定的 `request-privacy-bundle` Cordis group。热关闭先中止活动 HTTP/SSE 和设置 RPC，再由 Cordis 逆序释放 provider 目录、adapter、settings、Remote 与 listener；Web Client 根据 adapter 拓扑动态撤下或恢复设置 slot。单元测试验证 dispose/remount 无重复注册，真实 DSH 验收验证同一 PID 下可见入口 `1 → 0 → 1 → 0`、无控制台错误、无 OOM，并确认必须先热关闭再执行包删除。Harness 启动期 client discovery 已加载的静态 JS/词典/CSS 不承诺在进程内回收，最终清理需刷新页面或重启 profile。

## ISSUE-011：冻结上游适配器来源与发布供应链

状态：完成。

记录官方 `@deepseek-ai/dsh-llm-deepseek@0.1.2-rc.1` tarball、原始入口、受控修改入口、声明文件和补丁的 SHA-256。常规构建先校验仓库内冻结值；CI 另从批准镜像获取精确上游版本，核对 npm tarball 后重放最小补丁，并要求生成结果逐字节等于实际 vendored adapter。发布包必须携带 provenance 与补丁，便于用户独立审计。包元数据明确限制到已验收的 Linux x86-64，其他平台不再静默安装未验证版本。

## ISSUE-012：消除宿主依赖副本并验证真实 DSH 安装生命周期

状态：完成。

全部 DSH/React 宿主依赖保留精确 peer 约束，并标记为由宿主可选提供，避免 npm 在普通消费目录自动拉入第二套 DSH。源码测试所需模块单独固定在开发依赖。CI 从空目录安装精确 DSH 与 pnpm，通过原生 `dsh plugin` 完成首次安装、重复安装、peer 检查、配置组合和卸载，且卸载后恢复官方 provider。

## ISSUE-013：收紧设置 RPC 与流式传输失败边界

状态：完成。

设置写入只接受具有精确自有字段的普通对象，拒绝未知字段、继承字段、数组和错误 revision，避免宽松反序列化静默吞掉客户端错误。传输测试覆盖带 retry/request id 的 429、缺少 `[DONE]` 的截断 SSE、调用方取消、插件卸载取消与流空闲超时，确保每类故障进入稳定且可诊断的错误码。
