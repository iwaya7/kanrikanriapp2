import { StarShape } from './Icons';

interface Props {
  label: string;
  value?: number;
  /** 同じ星をもう一度タップすると undefined（未評価）になる */
  onChange?: (v: number | undefined) => void;
}

export function StarRating({ label, value, onChange }: Props) {
  const readOnly = !onChange;
  return (
    <div className="rating-row">
      <span className="rating-label">{label}</span>
      <div className="stars" role={readOnly ? 'img' : 'radiogroup'} aria-label={`${label} ${value ? `${value}点` : '未評価'}`}>
        {[1, 2, 3, 4, 5].map((n) =>
          readOnly ? (
            <span key={n} className={`star ${value && n <= value ? 'on' : ''}`}>
              <StarShape filled={!!value && n <= value} size={20} />
            </span>
          ) : (
            <button
              key={n}
              type="button"
              className={`star star-btn ${value && n <= value ? 'on' : ''}`}
              role="radio"
              aria-checked={value === n}
              aria-label={`${n}点`}
              onClick={() => onChange(value === n ? undefined : n)}
            >
              <StarShape filled={!!value && n <= value} />
            </button>
          ),
        )}
      </div>
    </div>
  );
}
