import Dexie, { type EntityTable } from 'dexie';
import type { RatingAxis, SettingRow, Work } from '../types';

export const DEFAULT_AXES: RatingAxis[] = [
  { id: 'fun', name: '面白さ', order: 0 },
  { id: 'moving', name: '感動', order: 1 },
  { id: 'story', name: 'ストーリー', order: 2 },
  { id: 'character', name: 'キャラクター', order: 3 },
  { id: 'expression', name: '映像・文章表現', order: 4 },
];

export const db = new Dexie('kanriapp') as Dexie & {
  works: EntityTable<Work, 'id'>;
  axes: EntityTable<RatingAxis, 'id'>;
  settings: EntityTable<SettingRow, 'key'>;
};

/*
 * スキーマを変えるときは version(2) を追加し、必要なら .upgrade() でデータを移行する。
 * （version(1) の定義は消さずに残す）
 */
db.version(1).stores({
  works: '++id, title, mediaType, status, date, externalKey, createdAt, updatedAt, *tags',
  axes: 'id, order',
  settings: 'key',
});

db.on('populate', (tx) => {
  tx.table('axes').bulkAdd(DEFAULT_AXES);
});
