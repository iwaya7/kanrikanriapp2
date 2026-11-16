import { useId, useState } from 'react';
import { IconClose } from './Icons';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}

/** タグ入力。Enter・読点・カンマで確定。既存タグを候補として出す */
export function TagInput({ value, onChange, suggestions = [] }: Props) {
  const [text, setText] = useState('');
  const listId = useId();

  const add = (raw: string) => {
    const parts = raw
      .split(/[,、，\n]/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);
    if (parts.length === 0) return;
    onChange(Array.from(new Set([...value, ...parts])));
    setText('');
  };

  const remaining = suggestions.filter((s) => !value.includes(s));

  return (
    <div className="tag-input">
      {value.length > 0 && (
        <div className="chips">
          {value.map((t) => (
            <span key={t} className="chip chip-tag">
              #{t}
              <button type="button" aria-label={`${t} を外す`} onClick={() => onChange(value.filter((v) => v !== t))}>
                <IconClose size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="tag-input-row">
        <input
          className="input"
          value={text}
          list={listId}
          enterKeyHint="done"
          placeholder="タグを入力して追加"
          onChange={(e) => {
            const v = e.target.value;
            if (/[,、，]$/.test(v)) add(v);
            else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add(text);
            }
          }}
          onBlur={() => add(text)}
        />
        <button type="button" className="btn btn-sub" onClick={() => add(text)} disabled={!text.trim()}>
          追加
        </button>
      </div>
      <datalist id={listId}>
        {remaining.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {remaining.length > 0 && (
        <div className="chips chips-suggest">
          {remaining.slice(0, 12).map((s) => (
            <button key={s} type="button" className="chip chip-suggest" onClick={() => onChange([...value, s])}>
              +{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
