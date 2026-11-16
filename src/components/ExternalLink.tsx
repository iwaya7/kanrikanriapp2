import { describeExternal } from '../api';
import type { ExternalRef } from '../types';
import { IconExternal } from './Icons';

/** 「AniList ID: 123 ↗」のような外部IDの表示 */
export function ExternalLink({ ext }: { ext: ExternalRef }) {
  const { label, url } = describeExternal(ext);
  const text = `${label} ID: ${ext.id}`;
  if (!url) return <span className="ext-link">{text}</span>;
  return (
    <a className="ext-link" href={url} target="_blank" rel="noreferrer">
      {text}
      <IconExternal size={14} />
    </a>
  );
}
