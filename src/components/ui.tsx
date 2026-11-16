import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/* ---------- 確認ダイアログ ---------- */

export interface DialogAction<T> {
  label: string;
  value: T;
  style?: 'primary' | 'danger' | 'default';
}

interface DialogRequest {
  title: string;
  message?: string;
  actions: DialogAction<unknown>[];
  resolve: (v: unknown) => void;
}

interface UiContext {
  ask<T>(opts: { title: string; message?: string; actions: DialogAction<T>[] }): Promise<T | null>;
  confirm(opts: { title: string; message?: string; okLabel?: string; danger?: boolean }): Promise<boolean>;
  toast(message: string): void;
}

const Ctx = createContext<UiContext | null>(null);

export function useUi(): UiContext {
  const v = useContext(Ctx);
  if (!v) throw new Error('UiProvider がありません');
  return v;
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; key: number } | null>(null);
  const toastTimer = useRef<number>();

  const ask = useCallback(<T,>(opts: { title: string; message?: string; actions: DialogAction<T>[] }) => {
    return new Promise<T | null>((resolve) => {
      setDialog({ ...opts, actions: opts.actions as DialogAction<unknown>[], resolve: resolve as (v: unknown) => void });
    });
  }, []);

  const confirm = useCallback(
    async (opts: { title: string; message?: string; okLabel?: string; danger?: boolean }) => {
      const r = await ask<boolean>({
        title: opts.title,
        message: opts.message,
        actions: [{ label: opts.okLabel ?? 'OK', value: true, style: opts.danger ? 'danger' : 'primary' }],
      });
      return r === true;
    },
    [ask],
  );

  const toast = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current);
    setToastMsg({ text, key: Date.now() });
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const close = (v: unknown) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Ctx.Provider value={{ ask, confirm, toast }}>
      {children}
      {dialog && (
        <div className="modal-backdrop" onClick={() => close(null)}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="modal-title" className="modal-title">
              {dialog.title}
            </h2>
            {dialog.message && <p className="modal-message">{dialog.message}</p>}
            <div className="modal-actions">
              {dialog.actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  className={`btn btn-block ${a.style === 'danger' ? 'btn-danger' : a.style === 'primary' ? 'btn-primary' : 'btn-sub'}`}
                  onClick={() => close(a.value)}
                >
                  {a.label}
                </button>
              ))}
              <button type="button" className="btn btn-block btn-ghost" onClick={() => close(null)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      {toastMsg && (
        <div key={toastMsg.key} className="toast" role="status">
          {toastMsg.text}
        </div>
      )}
    </Ctx.Provider>
  );
}

/* ---------- セグメントコントロール ---------- */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = '',
}: {
  value: T;
  options: { value: T; label: ReactNode; className?: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`segmented ${className}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`segmented-item ${o.className ?? ''} ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
