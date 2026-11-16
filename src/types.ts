/** 作品の種別 */
export type MediaType = 'anime' | 'novel' | 'movie';

/** 状態 */
export type WorkStatus = 'planned' | 'in_progress' | 'completed' | 'dropped';

/** 外部APIの識別子。新しいAPIを足すときはここに追加する */
export type ExternalSource = 'anilist' | 'googleBooks' | 'tmdb';

export interface ExternalRef {
  source: ExternalSource;
  id: string;
}

/** 作品の記録 */
export interface Work {
  id?: number;
  title: string;
  mediaType: MediaType;
  status: WorkStatus;
  /** 鑑賞日・読了日（YYYY-MM-DD） */
  date?: string;
  /** 作者・監督・制作会社 */
  creator?: string;
  /** 公開年・発売年 */
  year?: number;
  synopsis?: string;
  /** 詳細画面用の大きめの画像 */
  imageUrl?: string;
  /** 一覧用の小さい画像（なければ imageUrl を使う） */
  thumbnailUrl?: string;
  external?: ExternalRef;
  /** 重複チェック用のインデックス "anilist:12345"。external から自動生成 */
  externalKey?: string;
  tags: string[];
  memo?: string;
  /** 評価軸ID → 1〜5 */
  ratings: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

/** 評価軸 */
export interface RatingAxis {
  id: string;
  name: string;
  order: number;
}

/** 端末内の設定（キー・バリュー） */
export interface SettingRow {
  key: string;
  value: unknown;
}

export const MEDIA_TYPES: MediaType[] = ['anime', 'novel', 'movie'];
export const STATUSES: WorkStatus[] = ['planned', 'in_progress', 'completed', 'dropped'];

export const MEDIA_LABEL: Record<MediaType, string> = {
  anime: 'アニメ',
  novel: '小説',
  movie: '映画',
};

/** 種別によって言い回しが変わる状態ラベル */
export function statusLabel(status: WorkStatus, mediaType?: MediaType): string {
  const read = mediaType === 'novel';
  switch (status) {
    case 'planned':
      return mediaType ? (read ? '読みたい' : '見たい') : '見たい・読みたい';
    case 'in_progress':
      return mediaType ? (read ? '読書中' : '視聴中') : '視聴中・読書中';
    case 'completed':
      return '完了';
    case 'dropped':
      return '中断';
  }
}

export function dateLabel(mediaType: MediaType): string {
  return mediaType === 'novel' ? '読了日' : '鑑賞日';
}

export function creatorLabel(mediaType: MediaType): string {
  switch (mediaType) {
    case 'anime':
      return '制作会社・監督';
    case 'novel':
      return '作者';
    case 'movie':
      return '監督';
  }
}

export function makeExternalKey(ref?: ExternalRef): string | undefined {
  return ref ? `${ref.source}:${ref.id}` : undefined;
}
