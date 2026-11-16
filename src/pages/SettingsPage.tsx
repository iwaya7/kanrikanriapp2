import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { allProviders, type SearchProvider } from '../api';
import { IconDown, IconTrash, IconUp } from '../components/Icons';
import { useUi } from '../components/ui';
import { exportBackup, importBackup, parseBackup } from '../db/backup';
import { db } from '../db/db';
import { addAxis, apiKeySettingKey, deleteAxis, moveAxis, renameAxis, setSetting } from '../db/repo';
import { useAxes } from '../hooks/useData';
import type { RatingAxis } from '../types';

export function SettingsPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">設定</h1>
      </header>
      <AxesSection />
      {allProviders()
        .filter((p) => p.apiKey)
        .map((p) => (
          <ApiKeySection key={p.source} provider={p} />
        ))}
      <BackupSection />
      <StorageSection />
      <p className="hint about">鑑賞・読書きろく v{__APP_VERSION__}</p>
    </div>
  );
}

/* ---------- 評価軸 ---------- */

function AxesSection() {
  const axes = useAxes();
  const ui = useUi();
  const [newName, setNewName] = useState('');

  const add = async () => {
    if (!newName.trim()) return;
    await addAxis(newName);
    setNewName('');
  };

  const remove = async (a: RatingAxis) => {
    const ok = await ui.confirm({
      title: `「${a.name}」を削除しますか？`,
      message: 'この評価軸で付けた評価もすべての作品から削除されます。',
      okLabel: '削除する',
      danger: true,
    });
    if (ok) await deleteAxis(a.id);
  };

  return (
    <section className="card section">
      <h2 className="section-title">評価軸</h2>
      <ul className="axis-list">
        {axes.map((a, i) => (
          <li key={a.id} className="axis-item">
            <AxisNameInput axis={a} />
            <button type="button" className="icon-btn" aria-label="上へ" disabled={i === 0} onClick={() => moveAxis(a.id, -1)}>
              <IconUp size={20} />
            </button>
            <button type="button" className="icon-btn" aria-label="下へ" disabled={i === axes.length - 1} onClick={() => moveAxis(a.id, 1)}>
              <IconDown size={20} />
            </button>
            <button type="button" className="icon-btn icon-btn-danger" aria-label={`${a.name}を削除`} onClick={() => remove(a)}>
              <IconTrash size={20} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input className="input" placeholder="新しい評価軸（例: 音楽）" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={!newName.trim()}>
          追加
        </button>
      </form>
    </section>
  );
}

function AxisNameInput({ axis }: { axis: RatingAxis }) {
  const [name, setName] = useState(axis.name);
  useEffect(() => setName(axis.name), [axis.name]);
  const commit = () => {
    if (name.trim() && name.trim() !== axis.name) renameAxis(axis.id, name);
    else setName(axis.name);
  };
  return (
    <input
      className="input axis-name"
      value={name}
      aria-label="評価軸の名前"
      onChange={(e) => setName(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

/* ---------- APIキー ---------- */

function ApiKeySection({ provider }: { provider: SearchProvider }) {
  const ui = useUi();
  const key = apiKeySettingKey(provider.source);
  const saved = useLiveQuery(async () => ((await db.settings.get(key))?.value as string | undefined) ?? '', [key]);
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(false);

  const save = async () => {
    await setSetting(key, value.trim());
    setEditing(false);
    setValue('');
    ui.toast(value.trim() ? 'APIキーを保存しました' : 'APIキーを削除しました');
  };

  const masked = saved ? `${saved.slice(0, 4)}••••••••${saved.slice(-4)}` : '';

  return (
    <section className="card section">
      <h2 className="section-title">{provider.apiKey!.label}</h2>
      <p className="hint">
        {provider.apiKey!.required
          ? 'この検索にはAPIキーが必要です。'
          : 'キーなしでも動きますが、全利用者で共有の回数枠のためすぐ上限に達することがあります。登録をおすすめします。'}
        キーはこの端末の中だけに保存され、バックアップにも含まれません。
      </p>
      {saved && !editing ? (
        <div className="inline-form">
          <code className="masked">{masked}</code>
          <button type="button" className="btn btn-sub" onClick={() => setEditing(true)}>
            変更
          </button>
          <button
            type="button"
            className="btn btn-danger-ghost"
            onClick={async () => {
              if (await ui.confirm({ title: 'APIキーを削除しますか？', okLabel: '削除', danger: true })) {
                await setSetting(key, undefined);
                ui.toast('APIキーを削除しました');
              }
            }}
          >
            削除
          </button>
        </div>
      ) : (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <input
            className="input"
            placeholder="APIキーを貼り付け"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
            保存
          </button>
          {editing && (
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
              取消
            </button>
          )}
        </form>
      )}
      {provider.apiKey!.helpUrl && (
        <a className="hint-link" href={provider.apiKey!.helpUrl} target="_blank" rel="noreferrer">
          APIキーの取得ページを開く
        </a>
      )}
    </section>
  );
}

/* ---------- バックアップ ---------- */

function BackupSection() {
  const ui = useUi();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const count = useLiveQuery(() => db.works.count(), [], 0);

  const doExport = async () => {
    setBusy(true);
    try {
      const r = await exportBackup();
      if (r === 'downloaded') ui.toast('バックアップファイルを書き出しました');
      if (r === 'shared') ui.toast('バックアップを書き出しました');
    } catch (e) {
      ui.toast(`書き出しに失敗しました：${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    try {
      const data = parseBackup(await file.text());
      const mode = await ui.ask<'merge' | 'overwrite'>({
        title: 'バックアップを読み込む',
        message: `${data.works.length}件の作品が含まれています（${new Date(data.exportedAt).toLocaleString('ja-JP')} 作成）。\n\n追加：今の記録を残し、外部IDが同じ作品はスキップします。\n上書き：今の記録をすべて消して置き換えます。`,
        actions: [
          { label: '追加する', value: 'merge', style: 'primary' },
          { label: '上書きする', value: 'overwrite', style: 'danger' },
        ],
      });
      if (!mode) return;
      if (
        mode === 'overwrite' &&
        !(await ui.confirm({
          title: '本当に上書きしますか？',
          message: `現在の${count}件の記録と評価軸はすべて削除されます。`,
          okLabel: '上書きする',
          danger: true,
        }))
      )
        return;
      setBusy(true);
      const r = await importBackup(data, mode);
      ui.toast(`${r.added}件を読み込みました${r.skipped ? `（${r.skipped}件は登録済みのためスキップ）` : ''}`);
    } catch (e) {
      ui.toast(`読み込みに失敗しました：${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="card section">
      <h2 className="section-title">バックアップ</h2>
      <p className="hint">
        記録はこの端末の中にだけ保存されています。機種変更やデータ消失に備えて、ときどき書き出して「ファイル」アプリやiCloud Driveに保存してください。APIキーは含まれません。
      </p>
      <div className="stack">
        <button type="button" className="btn btn-primary btn-block" onClick={doExport} disabled={busy}>
          書き出す（エクスポート・{count}件）
        </button>
        <button type="button" className="btn btn-sub btn-block" onClick={() => fileRef.current?.click()} disabled={busy}>
          読み込む（インポート）
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>
    </section>
  );
}

/* ---------- ストレージ ---------- */

function StorageSection() {
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<string>('');
  const ui = useUi();

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
    navigator.storage
      ?.estimate?.()
      .then((e) => e.usage !== undefined && setUsage(`${(e.usage / 1024 / 1024).toFixed(1)} MB 使用中`))
      .catch(() => undefined);
  }, []);

  if (!navigator.storage?.persist) return null;

  return (
    <section className="card section">
      <h2 className="section-title">データの保護</h2>
      <p className="hint">
        ブラウザに「このサイトのデータを自動で消さない」よう依頼します。iPhoneではホーム画面に追加して使うと、データが消えにくくなります。
        {usage && ` (${usage})`}
      </p>
      {persisted ? (
        <p className="ok-text">保護されています</p>
      ) : (
        <button
          type="button"
          className="btn btn-sub btn-block"
          onClick={async () => {
            const ok = await navigator.storage.persist();
            setPersisted(ok);
            ui.toast(ok ? 'データの保護を有効にしました' : 'ブラウザに許可されませんでした（ホーム画面から使うと保護されやすくなります）');
          }}
        >
          データの保護を依頼する
        </button>
      )}
    </section>
  );
}
