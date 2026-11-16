import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * GitHub Pages の公開パス（base）を決める。
 * - GitHub Actions 上では GITHUB_REPOSITORY（"owner/repo"）からリポジトリ名を自動取得
 * - ローカルでビルドする場合は REPO_NAME を使う（リポジトリ名を変えたらここを変更）
 * - "ユーザー名.github.io" リポジトリの場合はルート（/）で公開される
 * - 環境変数 BASE_PATH を指定すればそれを最優先で使う
 */
const REPO_NAME = 'kanriapp';

function resolveBase(): string {
  if (process.env.BASE_PATH) return process.env.BASE_PATH;
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? REPO_NAME;
  if (repo.endsWith('.github.io')) return '/';
  return `/${repo}/`;
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? resolveBase() : '/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev'),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '鑑賞・読書きろく',
        short_name: 'きろく',
        description: 'アニメ・小説・映画の視聴/読書記録',
        lang: 'ja',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#5b4bd6',
        background_color: '#f4f3f8',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // 作品画像（AniList / Google Books / 手入力URL）を一度表示したらキャッシュ
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'work-images',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 90,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}));
