import { db } from './db';
import { makeExternalKey, type RatingAxis, type Work } from '../types';

/**
 * バックアップ形式。settings（APIキー等）は含めない。
 * 形式を変えたら version を上げ、importBackup で旧形式も読めるようにする。
 */
export interface BackupFile {
  app: 'kanriapp';
  version: 1;
  exportedAt: string;
  axes: RatingAxis[];
  works: Work[];
}

export async function createBackup(): Promise<BackupFile> {
  const [axes, works] = await Promise.all([db.axes.orderBy('order').toArray(), db.works.toArray()]);
  return { app: 'kanriapp', version: 1, exportedAt: new Date().toISOString(), axes, works };
}

function backupFileName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `kanriapp-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}

/**
 * iPhone では共有シートを開く（「"ファイル"に保存」を選べる）。
 * 共有に対応していない環境では通常のダウンロードにする。
 */
export async function exportBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const data = await createBackup();
  const json = JSON.stringify(data, null, 2);
  const name = backupFileName();
  const file = new File([json], name, { type: 'application/json' });

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
      // 共有に失敗したらダウンロードにフォールバック
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSONとして読み込めませんでした');
  }
  const d = data as Partial<BackupFile>;
  if (!d || d.app !== 'kanriapp' || !Array.isArray(d.works) || !Array.isArray(d.axes)) {
    throw new Error('このアプリのバックアップファイルではありません');
  }
  if (d.version !== 1) throw new Error(`未対応のバックアップ形式です（version: ${String(d.version)}）`);
  return d as BackupFile;
}

function sanitizeWork(w: Work): Work {
  const { id: _id, ...rest } = w;
  void _id;
  return {
    ...rest,
    tags: Array.isArray(rest.tags) ? rest.tags : [],
    ratings: rest.ratings && typeof rest.ratings === 'object' ? rest.ratings : {},
    externalKey: makeExternalKey(rest.external),
    createdAt: rest.createdAt ?? Date.now(),
    updatedAt: rest.updatedAt ?? Date.now(),
  };
}

export interface ImportResult {
  added: number;
  skipped: number;
}

/**
 * overwrite: 既存の作品と評価軸をすべて置き換える
 * merge: 追加。外部IDが同じ作品はスキップ。外部IDのない作品は
 *        「種別・タイトル・登録日時」が完全一致するもの（同じバックアップの再取り込み）だけスキップ
 */
export async function importBackup(data: BackupFile, mode: 'overwrite' | 'merge'): Promise<ImportResult> {
  const works = data.works.filter((w) => w && typeof w.title === 'string').map(sanitizeWork);

  return db.transaction('rw', db.works, db.axes, async () => {
    if (mode === 'overwrite') {
      await db.works.clear();
      await db.axes.clear();
      await db.axes.bulkAdd(data.axes.map((a, i) => ({ ...a, order: a.order ?? i })));
      await db.works.bulkAdd(works);
      return { added: works.length, skipped: 0 };
    }

    // 評価軸：同じIDがなければ末尾に追加
    const existingAxes = await db.axes.orderBy('order').toArray();
    const axisIds = new Set(existingAxes.map((a) => a.id));
    let order = existingAxes.length;
    const newAxes = data.axes.filter((a) => !axisIds.has(a.id)).map((a) => ({ ...a, order: order++ }));
    if (newAxes.length) await db.axes.bulkAdd(newAxes);

    const existing = await db.works.toArray();
    const keys = new Set(existing.map((w) => w.externalKey).filter(Boolean));
    const manualSig = new Set(existing.map((w) => `${w.mediaType}|${w.title}|${w.createdAt}`));
    const toAdd: Work[] = [];
    let skipped = 0;
    for (const w of works) {
      const dup = w.externalKey ? keys.has(w.externalKey) : manualSig.has(`${w.mediaType}|${w.title}|${w.createdAt}`);
      if (dup) {
        skipped++;
        continue;
      }
      if (w.externalKey) keys.add(w.externalKey);
      toAdd.push(w);
    }
    await db.works.bulkAdd(toAdd);
    return { added: toAdd.length, skipped };
  });
}
