import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: 'marisa',
        namespace: 'https://github.com/sparkuru',
        version: '0.1.0',
        description: 'marisa - tampermonkey userscript for enhanced SyncTV features',
        author: 'sparkuru',
        match: [
          'http://localhost:8080/*',
        ],
        grant: [
          'GM_getValue',
          'GM_setValue',
          'GM_deleteValue',
          'GM_listValues',
          'GM_xmlhttpRequest',
          'GM_addStyle'
        ],
        'run-at': 'document-idle',
        connect: [
          'api.bilibili.com',
          'api.dandanplay.net',
          'localhost',
          '127.0.0.1'
        ]
      },
      build: {
        fileName: 'marisa.user.js',
        externalGlobals: {}
      }
    })
  ],
  build: {
    target: 'esnext',
    minify: false
  }
});
