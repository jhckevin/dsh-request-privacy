# 0.4.2-rc.2 发布验收

结论：在 **Linux x86-64、Node 24.20.0、DSH 0.1.2-rc.1、pnpm 11.7.0** 的声明范围内，候选包已达到可部署的发布门禁。它不声称兼容未验收的 DSH 旧版、其他操作系统或 CPU 架构。

## 自动门禁

- 24 项测试通过，覆盖请求头最小化、配置快照、热加载生命周期、设置并发 revision、严格 RPC 输入、HTTP/SSE 故障分类和中英文词典完整性。
- 从官方 npm 镜像重新获取 `@deepseek-ai/dsh-llm-deepseek@0.1.2-rc.1`，验证 tarball SHA-256，重放最小补丁，并逐字节比对 vendored 结果。
- 打包后在带有真实 DSH 宿主的干净消费目录完成模块导入；发布物执行凭据扫描和文件白名单检查。
- 生产依赖 `npm audit --omit=dev` 为 0 个已知漏洞。

## 真实 DSH 生命周期

从空的 `DSH_HOME` 使用官方 `dsh plugin` 流程执行：

1. 安装候选 `.tgz`；
2. `pnpm peers check`，结果为 `No peer dependency issues found`；
3. 检查组合配置只有一个 privacy bundle 和一个 native provider，原 provider 被明确禁用；
4. 重复安装，确认没有重复 bundle/provider；
5. 卸载，确认插件目录、profile 依赖和 privacy 配置层均消失，官方 provider 恢复。

## WebUI

在隔离 profile 中启动真实 DSH WebUI，并用 Chromium 完成用户路径：

- DSH 全局语言为中文时，设置导航、说明、状态与元数据标签均显示中文；
- 在同一浏览器会话内把全局语言切换为 English 后，插件立即同步为英文；恢复中文后再次同步，无需刷新；
- 页面只出现一个开关，默认显示 `On · Minimized headers`；
- 关闭后，新的浏览器上下文读取到持久化的关闭状态；
- 再次开启后，界面显示 `Settings saved and applied live.`，服务器设置同步恢复为 `enabled: true`；
- 浏览器 console 和 page error 均为空。

![请求隐私中文设置页](images/request-privacy-042-settings-zh.png)

本轮没有向外部模型 API 发送请求。请求头和传输行为由真实 HTTP 捕获端验证，因此不会为了验收而发送聊天内容；真实服务商的保留、过滤和训练政策仍不在插件保证范围内。
