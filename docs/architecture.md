# Architecture — 0.4.0-rc.2

The installed bundle changes **chat-completion attribution only**. It does not install the historical prompt filter. User messages, system prompts, tool descriptions, sampling and model capabilities stay on the pinned upstream adapter path.

## Native composition

DSH 0.1.2-rc.1 treats a patch `name` as a match guard, not a rename. The bundle therefore disables the original `llm-deepseek` row and inserts `request-privacy-native-provider`. It does not modify an installed host file or patch global fetch. The provider id remains `deepseek-official` and the native settings namespace remains `llm-deepseek`. Existing sessions keep their route.

`vendor/deepseek.js` is the published MIT adapter from `@deepseek-ai/dsh-llm-deepseek@0.1.2-rc.1`. The bounded changes add a settings callback, capture its value at stream dispatch and branch the chat header construction. Files API headers are intentionally unchanged and are outside the feature claim.

The UI bridge uses the native settings service with revision-checked updates. Each request captures one mode before asynchronous credential resolution. Updating the setting never changes a request already in progress. Native retries are new dispatches and observe the current setting.

The legacy `deepseek-private` route remains registered for existing installations. It now restores native headers when disabled rather than throwing `PRIVACY_ROUTE_DISABLED`. New installations should use the standard DeepSeek model entry. The legacy route is not a full replacement for all newer native image capabilities.

## Custom deployment configuration

Persisted settings in `llm-deepseek` and its credential references are reused. A handwritten composition config on the old, disabled row is not automatically copied. Move such deployment overrides into your profile patch:

```yaml
- id: request-privacy-native-provider
  config:
    baseURL: https://your-provider.example/v1
    apiKeyEnv: YOUR_DEEPSEEK_KEY
```

Restate every config key you need: DSH replaces the row's whole config, rather than deeply merging it. Never put literal API keys in a public patch. Other plugins that replace the same native provider need separate compatibility review; duplicate route registrations must not be ignored.

## Lifecycle boundary

Install/update/remove while the host is stopped, then start the same profile. First-install bundle discovery is startup-only in this tested DSH release. Live **settings updates** are supported; first-install hot discovery is not claimed. Removing the bundle and restarting restores the official provider row. Disabling the bundle group alone while running is not an uninstall procedure: the original row remains disabled until the bundle patch is removed and the host restarts.

## Limits

- Only integrated DeepSeek chat-completion requests are covered, not every HTTP request made by the process.
- Headers do not provide anonymity or contractual training opt-out.
- No text-history cleaning, telemetry interception, system-wide proxying or credentials hiding.
- Unit/integration evidence is distinct from browser and paid-provider evidence. See the release acceptance record.
