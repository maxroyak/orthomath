import type { SpaceBalanceResult } from '../../domain/types';

interface Props {
  result: SpaceBalanceResult;
}

const STATUS_STYLES = {
  balanced: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Balanced' },
  minor: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Minor discrepancy' },
  unresolved: { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', label: 'Unresolved discrepancy' },
};

export function BalanceChain({ result }: Props) {
  const { startingDiscrepancy, mechanicEffects, finalBalance, status } = result;
  const s = STATUS_STYLES[status];

  // Build the chain: starting → each mechanic → final
  const items: { label: string; value: number; isStart?: boolean; isFinal?: boolean }[] = [
    { label: 'Initial', value: startingDiscrepancy, isStart: true },
    ...mechanicEffects.map((m) => ({ label: m.label, value: m.spaceEffect })),
    { label: 'Final', value: finalBalance, isFinal: true },
  ];

  return (
    <div>
      {/* Chain visualization */}
      <div className="flex items-center gap-1 flex-wrap mb-4">
        {items.map((item, i) => {
          const valStr = `${item.value > 0 ? '+' : ''}${item.value.toFixed(1)}`;
          const color = item.isStart
            ? 'text-slate-600'
            : item.isFinal
              ? s.text
              : item.value > 0
                ? 'text-emerald-600'
                : 'text-rose-600';

          return (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300 text-sm">→</span>}
              <div className={`px-2.5 py-1.5 rounded-lg text-sm font-medium ${
                item.isFinal ? s.bg + ' ' + s.border + ' border' : 'bg-slate-50'
              }`}>
                <div className="text-xs text-slate-400">{item.label}</div>
                <div className={`font-bold ${color}`}>{valStr}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Final balance big number */}
      <div className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Space Balance</div>
            <div className={`text-3xl font-bold ${s.text}`}>
              {finalBalance > 0 ? '+' : ''}{finalBalance.toFixed(1)} mm
            </div>
          </div>
          <div className={`text-sm font-medium ${s.text}`}>{s.label}</div>
        </div>
      </div>

      {/* Summary numbers */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-400">Initial</div>
          <div className="font-medium text-slate-700">{startingDiscrepancy.toFixed(1)} mm</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-400">Created</div>
          <div className="font-medium text-emerald-600">+{result.totalSpaceCreated.toFixed(1)} mm</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-400">Final</div>
          <div className={`font-medium ${s.text}`}>{finalBalance > 0 ? '+' : ''}{finalBalance.toFixed(1)} mm</div>
        </div>
      </div>
    </div>
  );
}