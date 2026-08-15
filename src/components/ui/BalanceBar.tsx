import type { SpaceBalanceResult } from '../../domain/types';

interface Props {
  result: SpaceBalanceResult;
}

export function BalanceBar({ result }: Props) {
  const { startingDiscrepancy, mechanicEffects, finalBalance, status } = result;

  // Build the waterfall segments
  const segments: { label: string; value: number; cumulative: number }[] = [];
  let cumulative = startingDiscrepancy;
  segments.push({ label: 'Starting', value: startingDiscrepancy, cumulative });

  for (const eff of mechanicEffects) {
    cumulative += eff.spaceEffect;
    segments.push({ label: eff.label, value: eff.spaceEffect, cumulative });
  }

  // Determine range for bar scaling
  const allValues = segments.map((s) => s.cumulative);
  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 0);
  const range = Math.max(Math.abs(minVal), Math.abs(maxVal), 1);

  const statusLabel = status === 'balanced' ? 'Balanced' : status === 'minor' ? 'Minor discrepancy' : 'Unresolved discrepancy';
  const statusTextColor = status === 'balanced' ? 'text-emerald-600' : status === 'minor' ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="space-y-3">
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${statusTextColor}`}>
          {statusLabel}
        </span>
        <span className={`text-sm font-bold ${statusTextColor}`}>
          {finalBalance > 0 ? '+' : ''}{finalBalance.toFixed(1)} mm
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
        {/* Zero line */}
        {minVal < 0 && maxVal > 0 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-slate-300 z-10"
            style={{ left: `${(Math.abs(minVal) / range) * 100}%` }}
          />
        )}
        {minVal < 0 && maxVal <= 0 && (
          <div className="absolute top-0 bottom-0 right-0 w-px bg-slate-300 z-10" />
        )}
        {minVal >= 0 && maxVal > 0 && (
          <div className="absolute top-0 bottom-0 left-0 w-px bg-slate-300 z-10" />
        )}

        {/* Segments */}
        {segments.map((seg, i) => {
          const prevCum = i === 0 ? 0 : segments[i - 1].cumulative;
          const left = Math.min(prevCum, seg.cumulative);
          const width = Math.abs(seg.value);

          if (width === 0) return null;

          const leftPct = ((left - minVal) / range) * 100;
          const widthPct = (width / range) * 100;

          const color = i === 0
            ? 'bg-slate-400'
            : seg.value > 0
              ? 'bg-primary-400'
              : 'bg-rose-400';

          return (
            <div
              key={i}
              className={`absolute top-1 bottom-1 ${color} rounded-sm transition-all`}
              style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
              title={`${seg.label}: ${seg.value > 0 ? '+' : ''}${seg.value.toFixed(1)} mm`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {segments.map((seg, i) => (
          <span key={i}>
            {seg.label}: <span className={seg.value < 0 ? 'text-rose-600' : 'text-emerald-600'}>
              {seg.value > 0 ? '+' : ''}{seg.value.toFixed(1)} mm
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
