import type { UserConfig } from 'tsdown'

const id = 'dsh-request-privacy'

export default {
  name: `${id}/client`,
  entry: { client: 'lib/client/index.js' },
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  dts: false,
  outDir: 'lib',
  clean: false,
  external: [
    'react',
    'react/jsx-runtime',
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-connection/client',
    '@deepseek-ai/dsh-client-modules/client',
    '@deepseek-ai/dsh-client-ui-slots',
  ],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
} satisfies UserConfig
