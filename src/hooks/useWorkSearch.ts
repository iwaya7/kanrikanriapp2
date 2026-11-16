import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ApiError, describeApiError, getProvider, type SearchResult } from '../api';
import { db } from '../db/db';
import { apiKeySettingKey } from '../db/repo';
import type { MediaType } from '../types';
import { useDebounce } from './useDebounce';

export type SearchState =
  | { status: 'idle'; results: [] }
  | { status: 'loading'; results: SearchResult[] }
  | { status: 'done'; results: SearchResult[] }
  | { status: 'error'; results: []; message: string; offline: boolean };

/**
 * 外部APIで作品を検索する。入力が 500ms 止まってから実行し、
 * 新しい検索が始まったら前のリクエストは中断する。
 */
export function useWorkSearch(mediaType: MediaType, query: string, enabled: boolean) {
  const provider = getProvider(mediaType);
  const debounced = useDebounce(query.trim(), 500);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<SearchState>({ status: 'idle', results: [] });

  // APIキー（任意）を端末内の設定から取得
  const apiKey = useLiveQuery(
    async () => (provider?.apiKey ? ((await db.settings.get(apiKeySettingKey(provider.source)))?.value as string | undefined) : undefined),
    [provider],
    null,
  );

  useEffect(() => {
    if (!provider || !enabled || debounced.length < 2 || apiKey === null) {
      setState({ status: 'idle', results: [] });
      return;
    }
    if (provider.apiKey?.required && !apiKey) {
      setState({ status: 'error', results: [], message: describeApiError(new ApiError('no_key', ''), provider.label), offline: false });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ status: 'loading', results: s.status === 'loading' || s.status === 'done' ? s.results : [] }));
    provider
      .search(debounced, { signal: ctrl.signal, apiKey: apiKey || undefined })
      .then((results) => {
        if (!ctrl.signal.aborted) setState({ status: 'done', results });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted || (e instanceof ApiError && e.kind === 'aborted')) return;
        console.warn(e);
        let message = describeApiError(e, provider.label);
        // キーなしの共有枠は上限に達しやすいので、キー登録を案内する
        if (e instanceof ApiError && e.kind === 'rate_limit' && provider.apiKey && !apiKey) {
          message += '\nAPIキーなしの検索は全利用者で共有の回数枠のため、設定画面でAPIキーを登録すると安定して検索できます。';
        }
        setState({
          status: 'error',
          results: [],
          message,
          offline: e instanceof ApiError && e.kind === 'offline',
        });
      });
    return () => ctrl.abort();
  }, [provider, debounced, enabled, apiKey, retry]);

  return {
    provider,
    state,
    /** デバウンス待ち中（入力直後）かどうか */
    pending: enabled && !!provider && query.trim() !== debounced && query.trim().length >= 2,
    retry: () => setRetry((n) => n + 1),
  };
}
