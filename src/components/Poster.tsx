import { useState } from 'react';
import type { MediaType } from '../types';
import { MEDIA_LABEL } from '../types';
import { IconAnime, IconMovie, IconNovel } from './Icons';

export function MediaIcon({ mediaType, size }: { mediaType: MediaType; size?: number }) {
  if (mediaType === 'anime') return <IconAnime size={size} />;
  if (mediaType === 'novel') return <IconNovel size={size} />;
  return <IconMovie size={size} />;
}

interface Props {
  title: string;
  mediaType: MediaType;
  src?: string;
  /** thumb: 一覧用 / large: 詳細用 */
  size?: 'thumb' | 'large' | 'mini';
  className?: string;
}

/**
 * ポスター比 2:3 固定の画像。画像がない・読み込み失敗時は種別ごとのプレースホルダーを表示。
 */
export function Poster({ title, mediaType, src, size = 'thumb', className = '' }: Props) {
  // src が変わったらエラー状態をリセットするため、失敗した URL を覚えておく
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const showImage = !!src && failedSrc !== src;

  return (
    <div className={`poster poster-${size} media-${mediaType} ${className}`}>
      {(!showImage || loaded !== src) && <Placeholder title={title} mediaType={mediaType} size={size} />}
      {showImage && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={loaded === src ? 'is-loaded' : ''}
          onLoad={() => setLoaded(src)}
          onError={() => setFailedSrc(src)}
        />
      )}
    </div>
  );
}

function Placeholder({ title, mediaType, size }: { title: string; mediaType: MediaType; size: Props['size'] }) {
  return (
    <div className="poster-ph" aria-hidden="true">
      <div className="poster-ph-pattern" />
      <div className="poster-ph-icon">
        <MediaIcon mediaType={mediaType} size={size === 'large' ? 44 : size === 'mini' ? 18 : 28} />
      </div>
      {size !== 'mini' && (
        <>
          <div className="poster-ph-title">{title || '無題'}</div>
          <div className="poster-ph-label">{MEDIA_LABEL[mediaType]}</div>
        </>
      )}
    </div>
  );
}
