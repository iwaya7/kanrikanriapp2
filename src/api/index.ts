import type { ExternalRef, ExternalSource, MediaType } from '../types';
import { anilistProvider } from './anilist';
import { googleBooksProvider } from './googleBooks';
import type { SearchProvider } from './types';

export * from './types';

/**
 * 種別ごとの検索プロバイダの登録表。
 * 映画に対応するときは src/api/tmdb.ts で SearchProvider を実装し、
 *   import { tmdbProvider } from './tmdb';
 *   movie: tmdbProvider,
 * を追加するだけでよい（APIキーの入力欄も設定画面に自動で出る）。
 */
const providers: Partial<Record<MediaType, SearchProvider>> = {
  anime: anilistProvider,
  novel: googleBooksProvider,
};

export function getProvider(mediaType: MediaType): SearchProvider | undefined {
  return providers[mediaType];
}

export function allProviders(): SearchProvider[] {
  return Object.values(providers).filter((p): p is SearchProvider => !!p);
}

export function getProviderBySource(source: ExternalSource): SearchProvider | undefined {
  return allProviders().find((p) => p.source === source);
}

/** 外部IDの表示名とリンク先 */
export function describeExternal(ref: ExternalRef): { label: string; url?: string } {
  const p = getProviderBySource(ref.source);
  return { label: p?.label ?? ref.source, url: p?.pageUrl?.(ref.id) };
}
