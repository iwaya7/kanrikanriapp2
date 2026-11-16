import { MEDIA_LABEL, statusLabel, type MediaType, type WorkStatus } from '../types';
import { MediaIcon } from './Poster';

export function TypeBadge({ mediaType }: { mediaType: MediaType }) {
  return (
    <span className={`badge badge-type media-${mediaType}`}>
      <MediaIcon mediaType={mediaType} size={12} />
      {MEDIA_LABEL[mediaType]}
    </span>
  );
}

export function StatusBadge({ status, mediaType }: { status: WorkStatus; mediaType: MediaType }) {
  return <span className={`badge badge-status status-${status}`}>{statusLabel(status, mediaType)}</span>;
}

/** 平均評価の小さな表示（★3.6） */
export function AvgScore({ value }: { value: number | null }) {
  if (value === null) return <span className="avg avg-none">未評価</span>;
  return (
    <span className="avg" aria-label={`平均評価 ${value.toFixed(1)}`}>
      <span className="avg-star">★</span>
      {value.toFixed(1)}
    </span>
  );
}
