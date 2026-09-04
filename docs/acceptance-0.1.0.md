# 0.1.0 验收记录

日期：2026-08-17

## 自动化门禁

- TypeScript 与 Web 客户端 bundle 构建通过。
- Vitest：3 个测试文件、7 个测试全部通过。
- 普通请求与 compaction 请求均通过本地捕获器验证。
- 捕获头中不存在 `deepseek-harness`，`User-Agent` 为固定中性身份。
- 三个产品/会话/压缩关联头均未发送。
- `Authorization` 与协议字段保持不变。
- 凭据重定向被拒绝，目标服务器未收到请求。
- 禁用隐私路由时明确失败，不静默回退。

## 打包与组合门禁

- 使用 Node.js 24 镜像和镜像 npm registry 构建。
- 从生成的 `.tgz` 安装到独立 Harness Web profile。
- 真实 Cordis 组合启动成功。
- 容器限制：768 MiB、1.5 CPU、512 PIDs、drop ALL capabilities、no-new-privileges。
- 验收时 `OOMKilled=false`，内存约 81 MiB。

## 浏览器门禁

在真实 WebUI 中完成：

1. “请求隐私”选项卡出现并加载完整快照；
2. 页面显示 `private-client` 和实际 `User-Agent` 预览；
3. 关闭开关并保存，出现实时生效提示；
4. 刷新后关闭状态与用户覆盖状态仍存在；
5. 恢复部署默认值后重新启用；
6. 最终页面无新增 error；重启测试容器期间记录到的连接重试 warning 属于预期恢复行为。

## 验收中发现并修复

- 设置桥与主适配器之间的模块循环导致首次组合启动失败。
- 设置桥直接实例化而未注册为独立 Cordis 插件，导致 WebUI Remote 不可用。
- peer 依赖过度锁定 rc.6，无法安装到 rc.7 组合环境；改为兼容范围。

## 边界

门禁证明本扩展管理的 HTTP 应用元数据已最小化。它不覆盖底层代理或 TLS 指纹，也不保证服务提供方如何处理账户、IP、请求正文或日志。
