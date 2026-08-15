import { useState } from 'react';

interface Props {
  label: string;
  formula: string;
  inputs: string;
  result: string;
}

export function InfoTooltip({ label, formula, inputs, result }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onBlur={() => setOpen(false)}
        className="ml-1 text-slate-400 hover:text-primary-600 transition-colors"
        aria-label={`Calculation details for ${label}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-sm">
          <div className="font-semibold text-slate-900 mb-2">{label}</div>
          <div className="space-y-1 text-slate-600">
            <div><span className="text-slate-400">Formula:</span> {formula}</div>
            <div><span className="text-slate-400">Inputs:</span> {inputs}</div>
            <div><span className="text-slate-400">Result:</span> <span className="font-medium text-slate-900">{result}</span></div>
          </div>
        </div>
      )}
    </span>
  );
}
