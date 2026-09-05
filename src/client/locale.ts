export const LOCALE_NAMESPACE = 'settings.requestPrivacy' as const

export const zh = {
  nav: '请求隐私', title: '请求隐私', subtitle: '减少发送给 DeepSeek 的额外关联信息，不改变聊天内容。',
  enabled: '精简请求头', enabledHint: '切换后自动保存，从下一次 DeepSeek 请求生效。已有对话也适用；正在生成的回复不受影响。',
  identity: '应用身份',
  preview: '实际发送的应用元数据', omitted: '默认省略', immutable: '不会修改',
  save: '保存', reset: '恢复部署默认值', saved: '设置已保存并实时生效。', failed: '保存失败，请刷新后重试。',
  nativeStatus: '已关闭 · 使用原生请求头', overrideStatus: '已开启 · 精简请求头', loading: '正在读取设置…', unavailable: '设置服务不可用。',
  boundary: '这不是官方的训练退出开关。服务商仍会收到 API Key 和聊天内容；文件上传及其他提供商不在本开关范围内。',
  offHint: '关闭时恢复原生用户标识、会话标识，以及压缩请求标记（如适用）。此处不展示这些标识的实际值。',
  userId: 'Harness 用户标识', sessionId: '会话关联标识', compaction: '压缩请求标记',
  auth: 'API Key（身份验证）', contentType: '请求内容类型', accept: '响应格式',
  messages: '你发送的消息', toolSchemas: '扩展工具的定义', modelParameters: '模型参数',
  noneOmitted: '已关闭精简，按原生规则发送。',
} as const

export const en = {
  nav: 'Request Privacy', title: 'Request Privacy', subtitle: 'Send less extra correlation metadata to DeepSeek without changing your chat.',
  enabled: 'Minimize request headers', enabledHint: 'Saves automatically. Applies to the next DeepSeek request, including existing chats. Replies already in progress keep their original mode.',
  identity: 'Application identity',
  preview: 'Application metadata sent', omitted: 'Omitted by default', immutable: 'Never modified',
  save: 'Save', reset: 'Restore deployment default', saved: 'Settings saved and applied live.', failed: 'Save failed. Refresh and retry.',
  nativeStatus: 'Off · Native request headers', overrideStatus: 'On · Minimized headers', loading: 'Loading settings…', unavailable: 'Settings service is unavailable.',
  boundary: 'Not an official training opt-out. Your provider still receives your API key and chat content. File uploads and other providers are outside this switch.',
  offHint: 'When off, native user/session identifiers and the compaction marker are restored where applicable. Their actual values are not shown here.',
  userId: 'Harness user identifier', sessionId: 'Session correlation identifier', compaction: 'Compaction marker',
  auth: 'API key (authentication)', contentType: 'Request content type', accept: 'Response format',
  messages: 'Your messages', toolSchemas: 'Extension tool definitions', modelParameters: 'Model parameters',
  noneOmitted: 'Minimization is off; native rules apply.',
} as const satisfies Record<keyof typeof zh, string>

export type LocaleKey = keyof typeof en

export const METADATA_LABELS: Readonly<Record<string, LocaleKey>> = {
  'product user id': 'userId', 'session correlation id': 'sessionId',
  'compaction classification': 'compaction', authorization: 'auth',
  'content-type': 'contentType', accept: 'accept',
  'user-authored messages': 'messages', 'user-authored extension tool schemas': 'toolSchemas',
  'model parameters': 'modelParameters',
}
