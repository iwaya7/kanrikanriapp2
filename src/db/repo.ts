import { db } from './db';
import { makeExternalKey, type RatingAxis, type Work } from '../types';
import type { ExternalSource } from '../types';

export type WorkInput = Omit<Work, 'id' | 'createdAt' | 'updatedAt' | 'externalKey'>;

function normalize(input: WorkInput): WorkInput & { externalKey?: string } {
  const tags = Array.from(new Set(input.tags.map((t) => t.trim()).filter(Boolean)));
  const ratings: Record<string, number> = {};
  for (const [k, v] of Object.entries(input.ratings)) {
    if (v >= 1 && v <= 5) ratings[k] = v;
  }
  const out: WorkInput & { externalKey?: string } = {
    ...input,
    title: input.title.trim(),
    tags,
    ratings,
    externalKey: makeExternalKey(input.external),
  };
  // undefined / 空文字のフィールドは保存しない
  for (const key of Object.keys(out) as (keyof typeof out)[]) {
    if (out[key] === undefined || out[key] === '') delete out[key];
  }
  return out;
}

export async function addWork(input: WorkInput): Promise<number> {
  const now = Date.now();
  const id = await db.works.add({ ...normalize(input), createdAt: now, updatedAt: now } as Work);
  return id as number;
}

export async function updateWork(id: number, input: WorkInput): Promise<void> {
  const prev = await db.works.get(id);
  if (!prev) throw new Error('作品が見つかりません');
  await db.works.put({ ...normalize(input), id, createdAt: prev.createdAt, updatedAt: Date.now() } as Work);
}

export async function deleteWork(id: number): Promise<void> {
  await db.works.delete(id);
}

/** 評価の平均（存在する評価軸のみ対象）。未評価なら null */
export function averageRating(work: Work, axes: RatingAxis[]): number | null {
  const vals = axes.map((a) => work.ratings[a.id]).filter((v): v is number => typeof v === 'number');
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/* ---------- 評価軸 ---------- */

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function addAxis(name: string): Promise<void> {
  const last = await db.axes.orderBy('order').last();
  await db.axes.add({ id: newId(), name: name.trim(), order: (last?.order ?? -1) + 1 });
}

export async function renameAxis(id: string, name: string): Promise<void> {
  await db.axes.update(id, { name: name.trim() });
}

export async function moveAxis(id: string, dir: -1 | 1): Promise<void> {
  await db.transaction('rw', db.axes, async () => {
    const axes = await db.axes.orderBy('order').toArray();
    const i = axes.findIndex((a) => a.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= axes.length) return;
    [axes[i], axes[j]] = [axes[j], axes[i]];
    await db.axes.bulkPut(axes.map((a, idx) => ({ ...a, order: idx })));
  });
}

/** 評価軸を削除し、各作品に残っているその軸の評価も消す */
export async function deleteAxis(id: string): Promise<void> {
  await db.transaction('rw', db.axes, db.works, async () => {
    await db.axes.delete(id);
    await db.works.toCollection().modify((w) => {
      if (id in w.ratings) delete w.ratings[id];
    });
  });
}

/* ---------- 設定（APIキーなど） ---------- */

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  if (value === undefined || value === '') await db.settings.delete(key);
  else await db.settings.put({ key, value });
}

export const apiKeySettingKey = (source: ExternalSource) => `apiKey:${source}`;
