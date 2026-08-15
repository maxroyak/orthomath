import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Patient, DiagnosticRecord, TreatmentScenario, MechanicType } from '../domain/types';
import { store } from '../persistence/store';
import { PatientHeader } from '../components/layout/PatientHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { calculateSpaceBalance, resolveMechanicSpaceEffect, calculateExtractionTotalSpace, getExtractionUnallocated } from '../domain/calculations/spaceBalance';
import { generateWarnings } from '../domain/warnings/warningEngine';

const MECHANIC_TYPES_ALL: MechanicType[] = ['IPR', 'EXPANSION', 'DISTALIZATION', 'EXTRACTION', 'INCISOR_MOVEMENT', 'CUSTOM'];

const MECHANIC_LABELS: Record<MechanicType, string> = {
  IPR: 'IPR',
  EXPANSION: 'Expansion',
  DISTALIZATION: 'Distalization',
  EXTRACTION: 'Extraction space',
  INCISOR_MOVEMENT: 'Incisor movement',
  CUSTOM: 'Custom',
};

export function ComparisonPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | undefined>();
  const [diag, setDiag] = useState<DiagnosticRecord | undefined>();
  const [scenarios, setScenarios] = useState<TreatmentScenario[]>([]);

  useEffect(() => {
    if (!patientId) return;
    setPatient(store.getPatient(patientId));
    setDiag(store.getDiagnostic(patientId));
    setScenarios(store.getScenarios(patientId));
  }, [patientId]);

  const settings = useMemo(() => store.getSettings(), []);

  const comparisonData = useMemo(() => {
    if (!diag) return [];
    const upperCrowding = diag.archMeasurements.find((a) => a.arch === 'upper')?.crowdingSpacing || 0;
    const lowerCrowding = diag.archMeasurements.find((a) => a.arch === 'lower')?.crowdingSpacing || 0;

    return scenarios.map((scenario) => {
      const resolvedMechanics = scenario.mechanics.map((m) => ({
        ...m,
        spaceEffect: resolveMechanicSpaceEffect(m, scenario.assumptions),
      }));
      const upperBalance = calculateSpaceBalance(upperCrowding, resolvedMechanics, 'upper', settings.balancedTolerance, settings.minorDiscrepancyThreshold);
      const lowerBalance = calculateSpaceBalance(lowerCrowding, resolvedMechanics, 'lower', settings.balancedTolerance, settings.minorDiscrepancyThreshold);
      const warnings = generateWarnings([upperBalance, lowerBalance], resolvedMechanics, scenario.assumptions);

      // Aggregate by type+arch
      const getMechTotal = (arch: 'upper' | 'lower', type: MechanicType) =>
        resolvedMechanics.filter((m) => m.arch === arch && m.type === type).reduce((s, m) => s + m.spaceEffect, 0);

      // Extraction totals
      const upperExtractionMechs = resolvedMechanics.filter((m) => m.arch === 'upper' && m.type === 'EXTRACTION');
      const lowerExtractionMechs = resolvedMechanics.filter((m) => m.arch === 'lower' && m.type === 'EXTRACTION');
      const upperExtractionTotal = upperExtractionMechs.reduce((s, m) => s + calculateExtractionTotalSpace(Object.values(m.parameters.toothWidths || {})), 0);
      const lowerExtractionTotal = lowerExtractionMechs.reduce((s, m) => s + calculateExtractionTotalSpace(Object.values(m.parameters.toothWidths || {})), 0);
      const upperUnallocated = upperExtractionMechs.reduce((s, m) => s + getExtractionUnallocated(
        calculateExtractionTotalSpace(Object.values(m.parameters.toothWidths || {})), m.parameters.extractionAllocation), 0);
      const lowerUnallocated = lowerExtractionMechs.reduce((s, m) => s + getExtractionUnallocated(
        calculateExtractionTotalSpace(Object.values(m.parameters.toothWidths || {})), m.parameters.extractionAllocation), 0);

      return {
        scenario, upperBalance, lowerBalance, warnings,
        resolvedMechanics, getMechTotal,
        upperExtractionTotal, lowerExtractionTotal, upperUnallocated, lowerUnallocated,
      };
    });
  }, [diag, scenarios, settings]);

  if (!patient) return <div className="text-slate-500">Patient not found.</div>;

  const upperCrowding = diag?.archMeasurements.find((a) => a.arch === 'upper')?.crowdingSpacing;
  const lowerCrowding = diag?.archMeasurements.find((a) => a.arch === 'lower')?.crowdingSpacing;

  const handleTogglePreferred = (scenario: TreatmentScenario) => {
    store.saveScenario({ ...scenario, isPreferred: !scenario.isPreferred });
    setScenarios(store.getScenarios(patientId!));
  };

  const statusBadge = (status: string, value: number) => {
    const cls = status === 'balanced' ? 'bg-emerald-100 text-emerald-700' :
      status === 'minor' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
    return <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{value > 0 ? '+' : ''}{value.toFixed(1)} mm</span>;
  };

  return (
    <div>
      <PatientHeader patient={patient} />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Scenario Comparison</h2>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/patient/${patientId}/summary`)}>
          Summary →
        </Button>
      </div>

      {comparisonData.length === 0 ? (
        <Card>
          <EmptyState
            title="No scenarios to compare"
            description="Create at least two treatment scenarios to compare them side by side."
            action={<Button onClick={() => navigate(`/patient/${patientId}/scenarios`)}>Go to scenarios</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Main comparison table */}
          <Card className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600 min-w-[200px]">Parameter</th>
                  {comparisonData.map(({ scenario }) => (
                    <th key={scenario.id} className="text-center px-4 py-3 font-medium text-slate-600 min-w-[140px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold text-slate-900">{scenario.name}</span>
                        {scenario.isPreferred && <span className="text-xs text-amber-600">★ Preferred by clinician</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Initial discrepancies (same for all) */}
                <tr className="bg-slate-50">
                  <td colSpan={comparisonData.length + 1} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Initial Discrepancy</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-600">Upper arch</td>
                  {comparisonData.map((_) => (
                    <td key={Math.random()} className="text-center px-4 py-3 text-slate-700">
                      {upperCrowding !== undefined ? `${upperCrowding > 0 ? '+' : ''}${upperCrowding.toFixed(1)} mm` : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-600">Lower arch</td>
                  {comparisonData.map((_) => (
                    <td key={Math.random()} className="text-center px-4 py-3 text-slate-700">
                      {lowerCrowding !== undefined ? `${lowerCrowding > 0 ? '+' : ''}${lowerCrowding.toFixed(1)} mm` : '—'}
                    </td>
                  ))}
                </tr>

                {/* Upper arch mechanics */}
                <tr className="bg-slate-50">
                  <td colSpan={comparisonData.length + 1} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Upper Arch Mechanics</td>
                </tr>
                {MECHANIC_TYPES_ALL.map((type) => {
                  const anyHas = comparisonData.some((d) => d.getMechTotal('upper', type) !== 0);
                  if (!anyHas) return null;
                  return (
                    <tr key={`upper-${type}`}>
                      <td className="px-4 py-3 text-slate-600">{MECHANIC_LABELS[type]}</td>
                      {comparisonData.map(({ scenario, getMechTotal }) => {
                        const total = getMechTotal('upper', type);
                        return (
                          <td key={scenario.id} className="text-center px-4 py-3">
                            {total !== 0 ? (
                              <span className={total > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                {total > 0 ? '+' : ''}{total.toFixed(1)} mm
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {/* Extraction-specific rows */}
                {comparisonData.some((d) => d.upperExtractionTotal > 0) && (
                  <>
                    <tr>
                      <td className="px-4 py-3 text-slate-600">Extraction total space</td>
                      {comparisonData.map(({ scenario, upperExtractionTotal }) => (
                        <td key={scenario.id} className="text-center px-4 py-3 text-slate-700">
                          {upperExtractionTotal > 0 ? `${upperExtractionTotal.toFixed(1)} mm` : <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-slate-600">Unallocated extraction space</td>
                      {comparisonData.map(({ scenario, upperUnallocated }) => (
                        <td key={scenario.id} className="text-center px-4 py-3">
                          {upperUnallocated !== 0 ? (
                            <span className={Math.abs(upperUnallocated) > 0.01 ? 'text-amber-600 font-medium' : 'text-slate-500'}>
                              {upperUnallocated > 0 ? '+' : ''}{upperUnallocated.toFixed(1)} mm
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-3 text-slate-700">Final upper balance</td>
                  {comparisonData.map(({ upperBalance }) => (
                    <td key={Math.random()} className="text-center px-4 py-3">
                      {statusBadge(upperBalance.status, upperBalance.finalBalance)}
                    </td>
                  ))}
                </tr>

                {/* Lower arch mechanics */}
                <tr className="bg-slate-50">
                  <td colSpan={comparisonData.length + 1} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Lower Arch Mechanics</td>
                </tr>
                {MECHANIC_TYPES_ALL.map((type) => {
                  const anyHas = comparisonData.some((d) => d.getMechTotal('lower', type) !== 0);
                  if (!anyHas) return null;
                  return (
                    <tr key={`lower-${type}`}>
                      <td className="px-4 py-3 text-slate-600">{MECHANIC_LABELS[type]}</td>
                      {comparisonData.map(({ scenario, getMechTotal }) => {
                        const total = getMechTotal('lower', type);
                        return (
                          <td key={scenario.id} className="text-center px-4 py-3">
                            {total !== 0 ? (
                              <span className={total > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                {total > 0 ? '+' : ''}{total.toFixed(1)} mm
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {comparisonData.some((d) => d.lowerExtractionTotal > 0) && (
                  <>
                    <tr>
                      <td className="px-4 py-3 text-slate-600">Extraction total space</td>
                      {comparisonData.map(({ scenario, lowerExtractionTotal }) => (
                        <td key={scenario.id} className="text-center px-4 py-3 text-slate-700">
                          {lowerExtractionTotal > 0 ? `${lowerExtractionTotal.toFixed(1)} mm` : <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-slate-600">Unallocated extraction space</td>
                      {comparisonData.map(({ scenario, lowerUnallocated }) => (
                        <td key={scenario.id} className="text-center px-4 py-3">
                          {lowerUnallocated !== 0 ? (
                            <span className={Math.abs(lowerUnallocated) > 0.01 ? 'text-amber-600 font-medium' : 'text-slate-500'}>
                              {lowerUnallocated > 0 ? '+' : ''}{lowerUnallocated.toFixed(1)} mm
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-3 text-slate-700">Final lower balance</td>
                  {comparisonData.map(({ lowerBalance }) => (
                    <td key={Math.random()} className="text-center px-4 py-3">
                      {statusBadge(lowerBalance.status, lowerBalance.finalBalance)}
                    </td>
                  ))}
                </tr>

                {/* Warnings count */}
                <tr>
                  <td className="px-4 py-3 text-slate-600">Warnings</td>
                  {comparisonData.map(({ scenario, warnings }) => (
                    <td key={scenario.id} className="text-center px-4 py-3">
                      {warnings.length > 0 ? <span className="text-amber-600">{warnings.length}</span> : <span className="text-emerald-600">None</span>}
                    </td>
                  ))}
                </tr>

                {/* Preferred selection */}
                <tr>
                  <td className="px-4 py-3 text-slate-600">Preferred</td>
                  {comparisonData.map(({ scenario }) => (
                    <td key={scenario.id} className="text-center px-4 py-3">
                      <button onClick={() => handleTogglePreferred(scenario)}
                        className={`text-sm ${scenario.isPreferred ? 'text-amber-600 font-medium' : 'text-slate-400 hover:text-amber-600'}`}>
                        {scenario.isPreferred ? '★ Preferred' : 'Set as preferred'}
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Card>

          {/* Warnings detail */}
          <Card title="Warnings Detail" className="mb-6">
            <div className="divide-y divide-slate-100">
              {comparisonData.map(({ scenario, warnings }) => (
                <div key={scenario.id} className="px-6 py-4">
                  <h4 className="font-medium text-slate-800 mb-2">{scenario.name}</h4>
                  {warnings.length === 0 ? (
                    <p className="text-sm text-emerald-600">No warnings.</p>
                  ) : (
                    <div className="space-y-2">
                      {warnings.map((w) => (
                        <div key={w.id} className={`p-3 rounded-lg text-sm border ${
                          w.level === 'conflict' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                          w.level === 'review' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          <span className="font-medium text-xs uppercase mr-2">
                            {w.level === 'conflict' ? 'Conflict' : w.level === 'review' ? 'Review' : 'Info'}
                          </span>
                          {w.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Assumptions comparison */}
          <Card title="Assumptions Comparison">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Assumption</th>
                    {comparisonData.map(({ scenario }) => (
                      <th key={scenario.id} className="text-center px-4 py-3 font-medium text-slate-600">{scenario.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {([
                    ['Expansion coefficient', 'expansionCoefficient', 'mm/mm'],
                    ['Incisor advancement coeff.', 'incisorAdvancementCoefficient', 'mm/mm'],
                    ['Incisor retraction coeff.', 'incisorRetractionCoefficient', 'mm/mm'],
                    ['Balanced tolerance', 'balancedTolerance', '±mm'],
                    ['IPR warning threshold', 'iprWarningThreshold', 'mm'],
                  ] as const).map(([label, field, unit]) => (
                    <tr key={field}>
                      <td className="px-4 py-3 text-slate-600">{label}</td>
                      {comparisonData.map(({ scenario }) => (
                        <td key={scenario.id} className="text-center px-4 py-3 text-slate-700">
                          {scenario.assumptions[field]} {unit}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-slate-400 mt-4 italic">
            OrthoMath does not rank treatment scenarios. The clinician manually selects the preferred scenario.
          </p>
        </>
      )}
    </div>
  );
}