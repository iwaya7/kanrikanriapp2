import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { AvgScore, StatusBadge, TypeBadge } from '../components/Badges';
import { ExternalLink } from '../components/ExternalLink';
import { IconBack, IconEdit, IconTrash } from '../components/Icons';
import { Poster } from '../components/Poster';
import { StarRating } from '../components/StarRating';
import { useUi } from '../components/ui';
import { db } from '../db/db';
import { averageRating, deleteWork } from '../db/repo';
import { useAxes } from '../hooks/useData';
import { goBack, navigate, routeHref } from '../hooks/useRoute';
import { creatorLabel, dateLabel } from '../types';

export function DetailPage({ id }: { id: number }) {
  const ui = useUi();
  const axes = useAxes();
  // undefined: 読み込み中 / null: 見つからない
  const work = useLiveQuery(async () => (await db.works.get(id)) ?? null, [id]);
  const [synopsisOpen, setSynopsisOpen] = useState(false);

  if (work === undefined) return <div className="page" />;
  if (work === null)
    return (
      <div className="page">
        <div className="empty">
          <p className="empty-title">作品が見つかりません</p>
          <a className="btn btn-primary" href="#/">
            一覧へ
          </a>
        </div>
      </div>
    );

  const avg = averageRating(work, axes);

  const setRating = async (axisId: string, v: number | undefined) => {
    // 詳細画面から直接評価を変更できる
    await db.works.where('id').equals(id).modify((w) => {
      if (v === undefined) delete w.ratings[axisId];
      else w.ratings[axisId] = v;
      w.updatedAt = Date.now();
    });
  };

  const remove = async () => {
    const ok = await ui.confirm({
      title: 'この記録を削除しますか？',
      message: `「${work.title}」を削除します。この操作は取り消せません。`,
      okLabel: '削除する',
      danger: true,
    });
    if (!ok) return;
    await deleteWork(id);
    ui.toast('削除しました');
    navigate({ name: 'list' }, { replace: true });
  };

  return (
    <div className="page page-detail">
      <header className="page-header">
        <button type="button" className="icon-btn" onClick={() => goBack()} aria-label="戻る">
          <IconBack />
        </button>
        <span className="page-title page-title-sm" />
        <a className="icon-btn" href={routeHref({ name: 'edit', id })} aria-label="編集">
          <IconEdit />
        </a>
      </header>

      <section className="detail-hero">
        <Poster title={work.title} mediaType={work.mediaType} src={work.imageUrl || work.thumbnailUrl} size="large" />
        <div className="detail-head">
          <div className="detail-badges">
            <TypeBadge mediaType={work.mediaType} />
            <StatusBadge status={work.status} mediaType={work.mediaType} />
          </div>
          <h1 className="detail-title">{work.title}</h1>
          <dl className="detail-meta">
            {work.creator && (
              <>
                <dt>{creatorLabel(work.mediaType)}</dt>
                <dd>{work.creator}</dd>
              </>
            )}
            {work.year && (
              <>
                <dt>{work.mediaType === 'novel' ? '発売年' : '公開年'}</dt>
                <dd>{work.year}年</dd>
              </>
            )}
            {work.date && (
              <>
                <dt>{dateLabel(work.mediaType)}</dt>
                <dd>{work.date.replace(/-/g, '/')}</dd>
              </>
            )}
          </dl>
          <div className="detail-avg">
            <AvgScore value={avg} />
          </div>
        </div>
      </section>

      {work.tags.length > 0 && (
        <div className="chips detail-tags">
          {work.tags.map((t) => (
            <span key={t} className="chip chip-tag">
              #{t}
            </span>
          ))}
        </div>
      )}

      <section className="card section">
        <h2 className="section-title">評価</h2>
        {axes.map((a) => (
          <StarRating key={a.id} label={a.name} value={work.ratings[a.id]} onChange={(v) => setRating(a.id, v)} />
        ))}
      </section>

      {work.memo && (
        <section className="card section">
          <h2 className="section-title">感想メモ</h2>
          <p className="prose">{work.memo}</p>
        </section>
      )}

      {work.synopsis && (
        <section className="card section">
          <h2 className="section-title">あらすじ</h2>
          <p className={`prose ${synopsisOpen ? '' : 'clamp'}`}>{work.synopsis}</p>
          {work.synopsis.length > 120 && (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setSynopsisOpen((v) => !v)}>
              {synopsisOpen ? '閉じる' : '続きを読む'}
            </button>
          )}
        </section>
      )}

      <section className="detail-foot">
        {work.external && <ExternalLink ext={work.external} />}
        <p className="hint">
          登録 {new Date(work.createdAt).toLocaleDateString('ja-JP')} ・ 更新 {new Date(work.updatedAt).toLocaleDateString('ja-JP')}
        </p>
        <div className="detail-actions">
          <a className="btn btn-sub btn-block" href={routeHref({ name: 'edit', id })}>
            <IconEdit size={18} /> 編集
          </a>
          <button type="button" className="btn btn-danger-ghost btn-block" onClick={remove}>
            <IconTrash size={18} /> 削除
          </button>
        </div>
      </section>
    </div>
  );
}
