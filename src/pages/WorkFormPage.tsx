import { useEffect, useMemo, useRef, useState } from 'react';
import { getProvider, type SearchResult } from '../api';
import { ExternalLink } from '../components/ExternalLink';
import { IconBack, IconClose, IconSearch } from '../components/Icons';
import { Poster } from '../components/Poster';
import { StarRating } from '../components/StarRating';
import { TagInput } from '../components/TagInput';
import { Segmented, useUi } from '../components/ui';
import { db } from '../db/db';
import { addWork, updateWork, type WorkInput } from '../db/repo';
import { useAllTags, useAxes, useWorks } from '../hooks/useData';
import { goBack, navigate } from '../hooks/useRoute';
import { useWorkSearch } from '../hooks/useWorkSearch';
import {
  creatorLabel,
  dateLabel,
  makeExternalKey,
  MEDIA_LABEL,
  MEDIA_TYPES,
  STATUSES,
  statusLabel,
  type ExternalRef,
  type MediaType,
  type Work,
  type WorkStatus,
} from '../types';

/** フォーム編集中の状態（数値も文字列で持つ） */
interface Draft {
  title: string;
  mediaType: MediaType;
  status: WorkStatus;
  date: string;
  creator: string;
  year: string;
  synopsis: string;
  imageUrl: string;
  thumbnailUrl?: string;
  external?: ExternalRef;
  tags: string[];
  memo: string;
  ratings: Record<string, number>;
}

const emptyDraft = (mediaType: MediaType = 'anime'): Draft => ({
  title: '',
  mediaType,
  status: 'completed',
  date: '',
  creator: '',
  year: '',
  synopsis: '',
  imageUrl: '',
  tags: [],
  memo: '',
  ratings: {},
});

function fromWork(w: Work): Draft {
  return {
    title: w.title,
    mediaType: w.mediaType,
    status: w.status,
    date: w.date ?? '',
    creator: w.creator ?? '',
    year: w.year ? String(w.year) : '',
    synopsis: w.synopsis ?? '',
    imageUrl: w.imageUrl ?? '',
    thumbnailUrl: w.thumbnailUrl,
    external: w.external,
    tags: [...w.tags],
    memo: w.memo ?? '',
    ratings: { ...w.ratings },
  };
}

function toInput(d: Draft): WorkInput {
  const year = parseInt(d.year, 10);
  return {
    title: d.title,
    mediaType: d.mediaType,
    status: d.status,
    date: d.date || undefined,
    creator: d.creator.trim() || undefined,
    year: Number.isFinite(year) ? year : undefined,
    synopsis: d.synopsis.trim() || undefined,
    imageUrl: d.imageUrl.trim() || undefined,
    thumbnailUrl: d.imageUrl.trim() ? d.thumbnailUrl : undefined,
    external: d.external,
    tags: d.tags,
    memo: d.memo.trim() || undefined,
    ratings: d.ratings,
  };
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function WorkFormPage({ editId }: { editId?: number }) {
  const isEdit = editId !== undefined;
  const ui = useUi();
  const axes = useAxes();
  const works = useWorks();
  const allTags = useAllTags(works);
  const titleRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [loaded, setLoaded] = useState(!isEdit);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  // タイトル欄にユーザーが入力した文字列（自動入力では変わらない）で検索する
  const [searchText, setSearchText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (editId === undefined) return;
    db.works.get(editId).then((w) => {
      if (w) setDraft(fromWork(w));
      else setNotFound(true);
      setLoaded(true);
    });
  }, [editId]);

  const registered = useMemo(
    () => new Map((works ?? []).filter((w) => w.externalKey).map((w) => [w.externalKey!, w.id!])),
    [works],
  );

  const provider = getProvider(draft.mediaType);
  const search = useWorkSearch(draft.mediaType, searchText, !isEdit && searchOpen);
  const showSearch = !isEdit && searchOpen && !!provider && searchText.trim().length >= 2;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const changeType = (m: MediaType) => {
    setDraft((d) => ({ ...d, mediaType: m }));
    if (!isEdit && searchText.trim()) setSearchOpen(true);
  };

  const changeStatus = (s: WorkStatus) => {
    // 「完了」にしたとき日付が空なら今日を入れる
    setDraft((d) => ({ ...d, status: s, date: s === 'completed' && !d.date ? today() : d.date }));
  };

  const pick = async (r: SearchResult) => {
    const existingId = registered.get(`${r.source}:${r.externalId}`);
    if (existingId !== undefined) {
      const open = await ui.confirm({
        title: '登録済みの作品です',
        message: `「${r.title}」はすでに記録されています。記録を開きますか？`,
        okLabel: '記録を開く',
      });
      if (open) navigate({ name: 'detail', id: existingId });
      return;
    }
    setDraft((d) => ({
      ...d,
      title: r.title,
      creator: r.creator ?? d.creator,
      year: r.year ? String(r.year) : d.year,
      synopsis: r.synopsis ?? d.synopsis,
      imageUrl: r.imageUrl ?? r.thumbnailUrl ?? '',
      thumbnailUrl: r.thumbnailUrl,
      external: { source: r.source, id: r.externalId },
    }));
    setSearchOpen(false);
    ui.toast('作品情報を自動入力しました。必要に応じて修正できます');
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(emptyDraft(draft.mediaType));

  const reset = async () => {
    if (isDirty && !(await ui.confirm({ title: '入力内容をクリアしますか？', okLabel: 'クリア', danger: true }))) return;
    setDraft(emptyDraft(draft.mediaType));
    setSearchText('');
    setSearchOpen(false);
  };

  const save = async () => {
    if (!draft.title.trim()) {
      ui.toast('タイトルを入力してください');
      titleRef.current?.focus();
      return;
    }
    const input = toInput(draft);
    if (!isEdit && input.external) {
      const existingId = registered.get(makeExternalKey(input.external)!);
      if (existingId !== undefined) {
        const ok = await ui.confirm({
          title: '同じ作品が登録済みです',
          message: 'それでも別の記録として登録しますか？',
          okLabel: '登録する',
        });
        if (!ok) return;
      }
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateWork(editId, input);
        ui.toast('保存しました');
        goBack({ name: 'detail', id: editId });
      } else {
        const id = await addWork(input);
        setDraft(emptyDraft(draft.mediaType));
        setSearchText('');
        setSearchOpen(false);
        ui.toast('登録しました');
        navigate({ name: 'detail', id }, { replace: true });
      }
    } catch (e) {
      console.error(e);
      ui.toast(`保存に失敗しました：${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="page" />;
  if (notFound)
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

  return (
    <div className="page page-form">
      <header className="page-header">
        {isEdit && (
          <button type="button" className="icon-btn" onClick={() => goBack({ name: 'detail', id: editId })} aria-label="戻る">
            <IconBack />
          </button>
        )}
        <h1 className="page-title">{isEdit ? '記録を編集' : '作品を追加'}</h1>
        {!isEdit && isDirty && (
          <button type="button" className="btn btn-ghost btn-small" onClick={reset}>
            クリア
          </button>
        )}
      </header>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="field">
          <span className="field-label">種別</span>
          <Segmented
            value={draft.mediaType}
            onChange={changeType}
            options={MEDIA_TYPES.map((m) => ({ value: m, label: MEDIA_LABEL[m], className: `media-${m}` }))}
            className="segmented-media"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="title">
            タイトル<span className="required">必須</span>
          </label>
          <div className="search-field">
            {!isEdit && provider && <IconSearch size={18} />}
            <input
              id="title"
              ref={titleRef}
              className="input"
              value={draft.title}
              autoComplete="off"
              enterKeyHint={!isEdit && provider ? 'search' : 'next'}
              placeholder={!isEdit && provider ? `入力すると ${provider.label} で検索します` : 'タイトル'}
              onChange={(e) => {
                set('title', e.target.value);
                setSearchText(e.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.preventDefault();
              }}
            />
          </div>
          {!isEdit && !provider && <p className="hint">{MEDIA_LABEL[draft.mediaType]}は手入力で登録します。</p>}
          {!isEdit && provider && !showSearch && !draft.external && (
            <p className="hint">2文字以上入力すると候補が表示されます。候補を選ばず手入力でも登録できます。</p>
          )}
        </div>

        {showSearch && (
          <section className="search-panel card" aria-live="polite">
            <div className="search-panel-head">
              <span>
                {provider!.label} の候補
                {(search.pending || search.state.status === 'loading') && <span className="spinner" aria-label="検索中" />}
              </span>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setSearchOpen(false)}>
                手入力で続ける
              </button>
            </div>

            {search.state.status === 'error' && (
              <div className="notice notice-error">
                <p>{search.state.message}</p>
                <div className="notice-actions">
                  {!search.state.offline && (
                    <button type="button" className="btn btn-sub btn-small" onClick={search.retry}>
                      再試行
                    </button>
                  )}
                  <button type="button" className="btn btn-sub btn-small" onClick={() => setSearchOpen(false)}>
                    手入力に切り替える
                  </button>
                </div>
              </div>
            )}

            {search.state.status === 'done' && search.state.results.length === 0 && (
              <p className="hint">見つかりませんでした。別の言葉で探すか、そのまま手入力で登録できます。</p>
            )}

            {search.state.results.length > 0 && (
              <ul className="candidates">
                {search.state.results.map((r) => {
                  const isRegistered = registered.has(`${r.source}:${r.externalId}`);
                  return (
                    <li key={`${r.source}:${r.externalId}`}>
                      <button type="button" className={`candidate ${isRegistered ? 'is-registered' : ''}`} onClick={() => pick(r)}>
                        <Poster title={r.title} mediaType={r.mediaType} src={r.thumbnailUrl} size="mini" />
                        <span className="candidate-body">
                          <span className="candidate-title">{r.title}</span>
                          {r.subtitle && <span className="candidate-sub">{r.subtitle}</span>}
                          <span className="candidate-meta">{[r.year, r.creator].filter(Boolean).join(' ・ ') || ' '}</span>
                        </span>
                        {isRegistered && <span className="badge badge-registered">登録済み</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {draft.external && (
          <div className="linked">
            <ExternalLink ext={draft.external} />
            <button type="button" className="btn btn-ghost btn-small" onClick={() => set('external', undefined)}>
              連携を解除
            </button>
          </div>
        )}

        <div className="field">
          <span className="field-label">状態</span>
          <Segmented
            value={draft.status}
            onChange={changeStatus}
            options={STATUSES.map((s) => ({ value: s, label: statusLabel(s, draft.mediaType) }))}
          />
        </div>

        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="date">
              {dateLabel(draft.mediaType)}
            </label>
            <div className="date-row">
              <input id="date" type="date" className="input" value={draft.date} onChange={(e) => set('date', e.target.value)} />
              {draft.date ? (
                <button type="button" className="icon-btn" aria-label="日付を消す" onClick={() => set('date', '')}>
                  <IconClose size={18} />
                </button>
              ) : (
                <button type="button" className="btn btn-sub btn-small" onClick={() => set('date', today())}>
                  今日
                </button>
              )}
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="year">
              {draft.mediaType === 'novel' ? '発売年' : '公開年'}
            </label>
            <input
              id="year"
              className="input"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="例: 2024"
              value={draft.year}
              onChange={(e) => set('year', e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="creator">
            {creatorLabel(draft.mediaType)}
          </label>
          <input id="creator" className="input" value={draft.creator} onChange={(e) => set('creator', e.target.value)} />
        </div>

        <div className="field">
          <span className="field-label">評価（タップで★、もう一度タップで解除）</span>
          <div className="ratings card">
            {axes.map((a) => (
              <StarRating
                key={a.id}
                label={a.name}
                value={draft.ratings[a.id]}
                onChange={(v) =>
                  setDraft((d) => {
                    const ratings = { ...d.ratings };
                    if (v === undefined) delete ratings[a.id];
                    else ratings[a.id] = v;
                    return { ...d, ratings };
                  })
                }
              />
            ))}
            {axes.length === 0 && <p className="hint">評価軸がありません。設定画面で追加できます。</p>}
          </div>
        </div>

        <div className="field">
          <span className="field-label">タグ</span>
          <TagInput value={draft.tags} onChange={(t) => set('tags', t)} suggestions={allTags} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="memo">
            感想メモ
          </label>
          <textarea id="memo" className="input textarea" rows={5} value={draft.memo} onChange={(e) => set('memo', e.target.value)} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="synopsis">
            あらすじ
          </label>
          <textarea
            id="synopsis"
            className="input textarea"
            rows={4}
            value={draft.synopsis}
            onChange={(e) => set('synopsis', e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="imageUrl">
            画像URL
          </label>
          <div className="image-field">
            <Poster title={draft.title} mediaType={draft.mediaType} src={draft.imageUrl.trim() || undefined} size="mini" />
            <input
              id="imageUrl"
              className="input"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://..."
              value={draft.imageUrl}
              // 手で変えたらサムネイルURLは使わず、この画像を一覧でも使う
              onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value, thumbnailUrl: undefined }))}
            />
          </div>
          <p className="hint">画像そのものは保存せず、URLだけを記録します。</p>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-block btn-large" disabled={saving}>
            {saving ? '保存中…' : isEdit ? '保存する' : '登録する'}
          </button>
        </div>
      </form>
    </div>
  );
}
