import { useMemo, useState } from 'react';
import { AvgScore, StatusBadge, TypeBadge } from '../components/Badges';
import { IconClose, IconFilter, IconGrid, IconRows, IconSearch } from '../components/Icons';
import { Poster } from '../components/Poster';
import { averageRating } from '../db/repo';
import { useAllTags, useAxes, useWorks } from '../hooks/useData';
import { routeHref } from '../hooks/useRoute';
import { MEDIA_LABEL, MEDIA_TYPES, STATUSES, statusLabel, type MediaType, type Work, type WorkStatus } from '../types';

type SortKey = 'created' | 'date' | 'avg' | `axis:${string}`;
type ViewMode = 'grid' | 'rows';

const VIEW_KEY = 'kanriapp:viewMode';

function loadViewMode(): ViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'rows' ? 'rows' : 'grid';
  } catch {
    return 'grid';
  }
}

function matchesKeyword(w: Work, kw: string): boolean {
  const hay = [w.title, w.creator ?? '', w.memo ?? '', ...w.tags].join('\n').toLowerCase();
  return kw
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((k) => hay.includes(k.replace(/^#/, '')));
}

export function ListPage() {
  const works = useWorks();
  const axes = useAxes();
  const allTags = useAllTags(works);

  const [keyword, setKeyword] = useState('');
  const [mediaType, setMediaType] = useState<MediaType | 'all'>('all');
  const [status, setStatus] = useState<WorkStatus | 'all'>('all');
  const [tag, setTag] = useState<string>('');
  const [sort, setSort] = useState<SortKey>('created');
  const [view, setView] = useState<ViewMode>(loadViewMode);
  const [showFilters, setShowFilters] = useState(false);

  const toggleView = () => {
    const next = view === 'grid' ? 'rows' : 'grid';
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* 保存できなくても動作には影響しない */
    }
  };

  const items = useMemo(() => {
    if (!works) return [];
    const list = works
      .filter((w) => mediaType === 'all' || w.mediaType === mediaType)
      .filter((w) => status === 'all' || w.status === status)
      .filter((w) => !tag || w.tags.includes(tag))
      .filter((w) => !keyword.trim() || matchesKeyword(w, keyword))
      .map((w) => ({ work: w, avg: averageRating(w, axes) }));

    const score = (x: (typeof list)[number]): number | null => {
      if (sort === 'avg') return x.avg;
      if (sort.startsWith('axis:')) return x.work.ratings[sort.slice(5)] ?? null;
      return null;
    };

    list.sort((a, b) => {
      if (sort === 'created') return b.work.createdAt - a.work.createdAt;
      if (sort === 'date') {
        // 日付のないものは最後
        if (!a.work.date && !b.work.date) return b.work.createdAt - a.work.createdAt;
        if (!a.work.date) return 1;
        if (!b.work.date) return -1;
        return b.work.date.localeCompare(a.work.date) || b.work.createdAt - a.work.createdAt;
      }
      const sa = score(a);
      const sb = score(b);
      if (sa === null && sb === null) return b.work.createdAt - a.work.createdAt;
      if (sa === null) return 1;
      if (sb === null) return -1;
      return sb - sa || b.work.createdAt - a.work.createdAt;
    });
    return list;
  }, [works, axes, mediaType, status, tag, keyword, sort]);

  const activeFilterCount = (mediaType !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0) + (tag ? 1 : 0);
  const sortValid = sort === 'created' || sort === 'date' || sort === 'avg' || axes.some((a) => `axis:${a.id}` === sort);

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">きろく</h1>
        <span className="page-count">{works ? `${items.length} / ${works.length}件` : ''}</span>
        <button type="button" className="icon-btn" onClick={toggleView} aria-label={view === 'grid' ? 'リスト表示に切り替え' : 'カード表示に切り替え'}>
          {view === 'grid' ? <IconRows /> : <IconGrid />}
        </button>
      </header>

      <div className="search-bar">
        <div className="search-field">
          <IconSearch size={18} />
          <input
            type="search"
            className="input input-search"
            placeholder="タイトル・作者・タグ・メモ"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            enterKeyHint="search"
          />
          {keyword && (
            <button type="button" className="search-clear" aria-label="検索語を消す" onClick={() => setKeyword('')}>
              <IconClose size={16} />
            </button>
          )}
        </div>
        <button
          type="button"
          className={`icon-btn filter-btn ${showFilters || activeFilterCount ? 'is-active' : ''}`}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-label="絞り込みと並び替え"
        >
          <IconFilter />
          {activeFilterCount > 0 && <span className="dot-count">{activeFilterCount}</span>}
        </button>
      </div>

      <div className="chips chips-scroll type-filter">
        <button type="button" className={`chip ${mediaType === 'all' ? 'is-active' : ''}`} onClick={() => setMediaType('all')}>
          すべて
        </button>
        {MEDIA_TYPES.map((m) => (
          <button
            key={m}
            type="button"
            className={`chip chip-media media-${m} ${mediaType === m ? 'is-active' : ''}`}
            onClick={() => setMediaType(mediaType === m ? 'all' : m)}
          >
            {MEDIA_LABEL[m]}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="filter-panel card">
          <div className="field">
            <span className="field-label">状態</span>
            <div className="chips">
              <button type="button" className={`chip ${status === 'all' ? 'is-active' : ''}`} onClick={() => setStatus('all')}>
                すべて
              </button>
              {STATUSES.map((s) => (
                <button key={s} type="button" className={`chip ${status === s ? 'is-active' : ''}`} onClick={() => setStatus(s)}>
                  {statusLabel(s, mediaType === 'all' ? undefined : mediaType)}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="field-label">タグ</span>
            <select className="input" value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">指定なし</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">並び替え</span>
            <select className="input" value={sortValid ? sort : 'created'} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="created">登録日（新しい順）</option>
              <option value="date">鑑賞日・読了日（新しい順）</option>
              <option value="avg">平均評価（高い順）</option>
              {axes.map((a) => (
                <option key={a.id} value={`axis:${a.id}`}>
                  {a.name}（高い順）
                </option>
              ))}
            </select>
          </label>
          {activeFilterCount > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setMediaType('all');
                setStatus('all');
                setTag('');
              }}
            >
              絞り込みを解除
            </button>
          )}
        </div>
      )}

      {works && works.length === 0 && (
        <div className="empty">
          <p className="empty-title">まだ記録がありません</p>
          <p>下の「追加」から、見た・読んだ作品を記録しましょう。</p>
          <a className="btn btn-primary" href="#/add">
            作品を追加する
          </a>
        </div>
      )}
      {works && works.length > 0 && items.length === 0 && (
        <div className="empty">
          <p className="empty-title">条件に合う作品がありません</p>
        </div>
      )}

      {view === 'grid' ? (
        <ul className="work-grid">
          {items.map(({ work, avg }) => (
            <li key={work.id}>
              <a className="work-card" href={routeHref({ name: 'detail', id: work.id! })}>
                <Poster title={work.title} mediaType={work.mediaType} src={work.thumbnailUrl || work.imageUrl} />
                <span className={`card-type-dot media-${work.mediaType}`} aria-hidden="true" />
                <div className="work-card-body">
                  <div className="work-card-title">{work.title}</div>
                  <div className="work-card-meta">
                    <TypeBadge mediaType={work.mediaType} />
                    <AvgScore value={avg} />
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="work-rows">
          {items.map(({ work, avg }) => (
            <li key={work.id}>
              <a className="work-row" href={routeHref({ name: 'detail', id: work.id! })}>
                <Poster title={work.title} mediaType={work.mediaType} src={work.thumbnailUrl || work.imageUrl} size="mini" />
                <div className="work-row-body">
                  <div className="work-row-title">{work.title}</div>
                  <div className="work-row-sub">
                    {[work.creator, work.year, work.date && `${work.date.replace(/-/g, '/')}`].filter(Boolean).join(' ・ ')}
                  </div>
                  <div className="work-row-meta">
                    <TypeBadge mediaType={work.mediaType} />
                    <StatusBadge status={work.status} mediaType={work.mediaType} />
                    <AvgScore value={avg} />
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
