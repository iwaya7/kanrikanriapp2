import { ApiError } from './types';

/** fetch して JSON を返す。オフライン・429・HTTPエラーを ApiError に変換する */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError('offline', 'offline');
  }
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') throw new ApiError('aborted', 'aborted');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ApiError('offline', 'offline');
    throw new ApiError('network', String(e));
  }
  if (res.status === 429) throw new ApiError('rate_limit', 'rate limited', 429);
  if (!res.ok) {
    // Google Books はクォータ超過を 403 で返すことがある
    if (res.status === 403) {
      const body = await res.text().catch(() => '');
      if (/quota|rateLimit|limit/i.test(body)) throw new ApiError('rate_limit', body, 403);
    }
    throw new ApiError('http', `HTTP ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

/** http:// の画像URLを https:// にする（混在コンテンツ対策） */
export function toHttps(url?: string): string | undefined {
  return url?.replace(/^http:\/\//, 'https://');
}

/** HTMLタグや実体参照を取り除いて素のテキストにする */
export function stripHtml(html?: string | null): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || undefined;
}
