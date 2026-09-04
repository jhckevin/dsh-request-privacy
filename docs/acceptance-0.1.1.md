# 0.1.1 网关与 WebUI 验收记录

日期：2026-08-17

## 测试拓扑

```text
浏览器
  -> Harness Web/API gateway container (172.30.9.3)
  -> deepseek-private provider
  -> isolated capture container (172.30.9.2:8080)
```

捕获端不映射任何宿主端口，只有隔离 Docker 网络成员可以访问。Harness 默认模型在组合结果中明确为 `provider: deepseek-private`、`model: deepseek-v4-flash`。

## 最终捕获结果

主 Agent 请求和标题请求各一条：

- 捕获端观察到的源地址均为 `172.30.9.3`，与 Harness 容器地址一致；
- `User-Agent` 均为 `private-client/0.1.1 (+https://localhost.invalid/private-client)`；
- 请求头中 `deepseek-harness` 命中 0；
- 请求体中 `deepseek-harness` 命中 0；
- `x-deepseek-harness-*` 请求头数量 0；
- 测试鉴权保持为预期 Bearer 值；
- 两次请求均到达 `/chat/completions` 且模型为 `deepseek-v4-flash`。

第一次未安装 prompt filter 的对照捕获在主请求体发现 3 处 Harness 自有系统提示身份。安装原生 assembly filter 后，最终打包态复测又在平台内置 `bash` 工具描述中发现 1 处品牌词。增加仅针对平台内置工具描述的中性化后，最终主请求和标题请求均降为 0；旧证据保存在验收目录中。

## 禁用门禁

从 WebUI 关闭隐私路由后，新会话明确返回 `PRIVACY_ROUTE_DISABLED`。当时捕获文件保持 6 条历史请求，证明该次操作没有网络发送和静默回退；恢复启用并执行最终制品复测后，文件才正常增加到 8 条。

## WebUI

- 白色“保存”按钮计算样式：背景 `rgb(249, 250, 251)`，文字 `rgb(17, 17, 17)`；
- 设置页显示固定中性身份、五类省略项和六类保持不变项；
- 浏览器最终 error 为 0；
- Harness 容器 `OOMKilled=false`，约 113 MiB / 768 MiB；捕获端约 16 MiB / 128 MiB。

## 自动化

- TypeScript 与客户端 bundle 构建通过；
- Vitest：4 个测试文件、9 个测试全部通过；
- 新增精确命名段过滤和内置工具描述中性化测试，确认用户自有段、用户消息、第三方扩展工具、上下文和变量保持不变。

## 边界

扩展仅删除 Harness 自有产品身份段，并中性化平台内置工具描述中的品牌词，不扫描用户文本，也不修改第三方扩展工具描述。若用户主动输入产品名称，它会作为用户消息保留。扩展仍不能隐藏 IP、API key 账户归属或 TLS/网络指纹，也不能控制服务商的数据政策。
