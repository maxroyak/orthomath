import type { Patient, DiagnosticRecord, TreatmentScenario } from '../../domain/types';
import { store } from '../../persistence/store';
import { useMemo } from 'react';

interface Props {
  patient: Patient;
}

export function PatientHeader({ patient }: Props) {
  const diagnostic = useMemo<DiagnosticRecord | undefined>(
    () => store.getDiagnostic(patient.id),
    [patient.id],
  );
  const scenarios = useMemo<TreatmentScenario[]>(
    () => store.getScenarios(patient.id),
    [patient.id],
  );

  const upperCrowding = diagnostic?.archMeasurements.find((a) => a.arch === 'upper')?.crowdingSpacing;
  const lowerCrowding = diagnostic?.archMeasurements.find((a) => a.arch === 'lower')?.crowdingSpacing;
  const preferred = scenarios.find((s) => s.isPreferred);

  const ageStr = patient.age
    ? `${patient.age} y`
    : patient.dateOfBirth
      ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} y`
      : '';

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 mb-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">{patient.name}</h1>
          {ageStr && <span className="text-sm text-slate-500">· {ageStr}</span>}
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          {upperCrowding !== undefined && (
            <span>
              <span className="text-slate-400">Upper:</span>{' '}
              <span className={upperCrowding < 0 ? 'text-rose-600 font-medium' : 'text-emerald-600 font-medium'}>
                {upperCrowding > 0 ? '+' : ''}{upperCrowding.toFixed(1)} mm
              </span>
            </span>
          )}
          {lowerCrowding !== undefined && (
            <span>
              <span className="text-slate-400">Lower:</span>{' '}
              <span className={lowerCrowding < 0 ? 'text-rose-600 font-medium' : 'text-emerald-600 font-medium'}>
                {lowerCrowding > 0 ? '+' : ''}{lowerCrowding.toFixed(1)} mm
              </span>
            </span>
          )}
          <span>
            <span className="text-slate-400">Scenarios:</span> {scenarios.length}
          </span>
          {preferred && (
            <span>
              <span className="text-slate-400">Preferred:</span>{' '}
              <span className="text-primary-600 font-medium">{preferred.name}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}