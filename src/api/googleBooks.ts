import { fetchJson, toHttps } from './http';
import type { SearchOptions, SearchProvider, SearchResult } from './types';

/** Google Books API（キーなしでも動作。キーがあれば使用） */
const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';

interface Volume {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    language?: string;
    imageLinks?: { smallThumbnail?: string; thumbnail?: string };
  };
}

interface VolumesResponse {
  totalItems: number;
  items?: Volume[];
}

function cleanImage(url?: string): string | undefined {
  // 本のめくれ効果（edge=curl）を外し、https にする
  return toHttps(url?.replace(/&edge=curl/g, ''));
}

function toResult(v: Volume): SearchResult {
  const info = v.volumeInfo;
  const year = info.publishedDate ? parseInt(info.publishedDate.slice(0, 4), 10) : NaN;
  const thumb = cleanImage(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail);
  return {
    source: 'googleBooks',
    externalId: v.id,
    mediaType: 'novel',
    title: info.title ?? '(タイトル不明)',
    subtitle: info.subtitle,
    year: Number.isFinite(year) ? year : undefined,
    creator: info.authors?.join('、'),
    synopsis: info.description,
    // Google Books は大きい画像を安定して返さないため、一覧・詳細とも thumbnail を使う
    thumbnailUrl: thumb,
    imageUrl: thumb,
  };
}

async function query(q: string, opts: SearchOptions | undefined, langRestrict?: string): Promise<Volume[]> {
  const params = new URLSearchParams({ q, maxResults: '20', printType: 'books' });
  if (langRestrict) params.set('langRestrict', langRestrict);
  if (opts?.apiKey) params.set('key', opts.apiKey);
  const json = await fetchJson<VolumesResponse>(`${ENDPOINT}?${params}`, { signal: opts?.signal });
  return json.items ?? [];
}

export const googleBooksProvider: SearchProvider = {
  source: 'googleBooks',
  mediaType: 'novel',
  label: 'Google Books',
  pageUrl: (id) => `https://books.google.com/books?id=${encodeURIComponent(id)}`,
  apiKey: {
    required: false,
    label: 'Google Books APIキー（任意）',
    helpUrl: 'https://console.cloud.google.com/apis/library/books.googleapis.com',
  },
  async search(q, opts) {
    // まず日本語の本に絞って検索し、見つからなければ言語制限なしで再検索
    let items = await query(q, opts, 'ja');
    if (items.length === 0) items = await query(q, opts);
    // 日本語の本を先頭に
    items.sort((a, b) => Number(b.volumeInfo.language === 'ja') - Number(a.volumeInfo.language === 'ja'));
    // 同じIDの重複を除く
    const seen = new Set<string>();
    return items.filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true))).map(toResult);
  },
};
