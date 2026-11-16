import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db/db';
import type { RatingAxis, Work } from '../types';

/** すべての作品（DBが変わると自動で再描画） */
export function useWorks(): Work[] | undefined {
  return useLiveQuery(() => db.works.toArray(), []);
}

/** 評価軸（並び順どおり） */
export function useAxes(): RatingAxis[] {
  return useLiveQuery(() => db.axes.orderBy('order').toArray(), [], []);
}

/** 登録済みのタグ（使用回数の多い順） */
export function useAllTags(works: Work[] | undefined): string[] {
  return useMemo(() => {
    const count = new Map<string, number>();
    for (const w of works ?? []) for (const t of w.tags) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja')).map(([t]) => t);
  }, [works]);
}
