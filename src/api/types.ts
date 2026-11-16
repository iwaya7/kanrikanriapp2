import type { ExternalSource, MediaType } from '../types';

/** すべての外部APIの検索結果をこの形に変換して画面に渡す */
export interface SearchResult {
  source: ExternalSource;
  externalId: string;
  mediaType: MediaType;
  title: string;
  /** 原題・ローマ字表記など補助的なタイトル */
  subtitle?: string;
  year?: number;
  creator?: string;
  synopsis?: string;
  /** 詳細画面用の大きめの画像 */
  imageUrl?: string;
  /** 一覧・候補表示用の小さい画像 */
  thumbnailUrl?: string;
}

export interface SearchOptions {
  signal?: AbortSignal;
  apiKey?: string;
}

/** 外部API 1つ分のモジュールが実装するインターフェース */
export interface SearchProvider {
  source: ExternalSource;
  mediaType: MediaType;
  /** 表示名（例: "AniList"） */
  label: string;
  /**
   * APIキーの扱い。指定すると設定画面に入力欄が自動で表示される。
   * required: キーがないと検索できない / optional: なくても動く
   */
  apiKey?: {
    required: boolean;
    label: string;
    helpUrl?: string;
  };
  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
  /** 外部サイトの作品ページURL（詳細画面のリンクに使う） */
  pageUrl?(externalId: string): string;
}

export type ApiErrorKind = 'offline' | 'rate_limit' | 'http' | 'network' | 'aborted' | 'no_key';

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 画面に出すためのわかりやすいメッセージ */
export function describeApiError(e: unknown, label: string): string {
  if (e instanceof ApiError) {
    switch (e.kind) {
      case 'offline':
        return 'オフラインのため検索できません。電波のよい場所で再度お試しいただくか、手入力で登録してください。';
      case 'rate_limit':
        return `${label} の検索回数の上限に達しました。少し時間をおいてから再度お試しください（手入力での登録はそのまま可能です）。`;
      case 'no_key':
        return `${label} を使うにはAPIキーが必要です。設定画面で登録してください。`;
      case 'network':
        return `${label} に接続できませんでした。通信状況を確認してください。`;
      case 'http':
        return `${label} でエラーが発生しました（${e.status ?? '不明'}）。手入力で登録できます。`;
      case 'aborted':
        return '';
    }
  }
  return `${label} の検索中に予期しないエラーが発生しました。手入力で登録できます。`;
}
