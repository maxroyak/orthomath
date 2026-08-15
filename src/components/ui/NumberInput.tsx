import { useState, useEffect } from 'react';

interface Props {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  label?: string;
  id?: string;
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  unit = 'mm',
  className = '',
  label,
  id,
}: Props) {
  const [text, setText] = useState<string>(
    value !== undefined && value !== null ? String(value) : ''
  );

  useEffect(() => {
    const v = text.trim().replace(',', '.');
    if (v === '') {
      onChange(undefined);
    } else {
      const n = parseFloat(v);
      if (!isNaN(n)) {
        onChange(n);
      }
    }
  }, [text, onChange]);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-600 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            // Allow only numbers, decimal point, comma, and minus
            const filtered = e.target.value.replace(/[^0-9.,\-]/g, '');
            setText(filtered);
          }}
          onBlur={() => {
            // Normalize on blur
            const v = text.trim().replace(',', '.');
            if (v !== '' && !isNaN(parseFloat(v))) {
              setText(String(parseFloat(v)));
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
