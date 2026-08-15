import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Patient, DiagnosticRecord, TreatmentScenario } from '../domain/types';
import { store } from '../persistence/store';
import { PatientHeader } from '../components/layout/PatientHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { calculateSpaceBalance, resolveMechanicSpaceEffect } from '../domain/calculations/spaceBalance';
import { generateWarnings } from '../domain/warnings/warningEngine';

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
    return scenarios.map((scenario) => {
      const resolvedMechanics = scenario.mechanics.map((m) => ({
        ...m,
        spaceEffect: resolveMechanicSpaceEffect(m, scenario.assumptions),
      }));
      const upperCrowding = diag.archMeasurements.find((a) => a.arch === 'upper')?.crowdingSpacing || 0;
      const lowerCrowding = diag.archMeasurements.find((a) => a.arch === 'lower')?.crowdingSpacing || 0;
      const upperBalance = calculateSpaceBalance(upperCrowding, resolvedMechanics, 'upper', settings.balancedTolerance, settings.minorDiscrepancyThreshold);
      const lowerBalance = calculateSpaceBalance(lowerCrowding, resolvedMechanics, 'lower', settings.balancedTolerance, settings.minorDiscrepancyThreshold);
      const warnings = generateWarnings([upperBalance, lowerBalance], resolvedMechanics, scenario.assumptions);

      // Aggregate mechanics by type and arch
      const upperMechanics = resolvedMechanics.filter((m) => m.arch === 'upper');
      const lowerMechanics = resolvedMechanics.filter((m) => m.arch === 'lower');

      return { scenario, upperBalance, lowerBalance, warnings, upperMechanics, lowerMechanics };
    });
  }, [diag, scenarios, settings]);

  if (!patient) return <div className="text-slate-500">Patient not found.</div>;

  // Collect all mechanic types used across scenarios
  const allMechanicTypes = new Set<string>();
  comparisonData.forEach(({ upperMechanics, lowerMechanics }) => {
    [...upperMechanics, ...lowerMechanics].forEach((m) => allMechanicTypes.add(m.type));
  });

  const getMechanicTotal = (mechanics: typeof comparisonData[0]['upperMechanics'], type: string) => {
    return mechanics.filter((m) => m.type === type).reduce((s, m) => s + m.spaceEffect, 0);
  };

  const handleTogglePreferred = (scenario: TreatmentScenario) => {
    store.saveScenario({ ...scenario, isPreferred: !scenario.isPreferred });
    setScenarios(store.getScenarios(patientId!));
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
          {/* Comparison table */}
          <Card className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600 min-w-[180px]">Parameter</th>
                  {comparisonData.map(({ scenario }) => (
                    <th key={scenario.id} className="text-center px-4 py-3 font-medium text-slate-600">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold text-slate-900">{scenario.name}</span>
                        {scenario.isPreferred && <span className="text-xs text-amber-600">★ Preferred by clinician</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Upper mechanics by type */}
                <tr className="bg-slate-50">
                  <td colSpan={comparisonData.length + 1} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Upper Arch</td>
                </tr>
                {Array.from(allMechanicTypes).map((type) => (
                  <tr key={`upper-${type}`}>
                    <td className="px-4 py-3 text-slate-600">{type === 'INCISOR_MOVEMENT' ? 'Incisor Movement' : type.charAt(0) + type.slice(1).toLowerCase()}</td>
                    {comparisonData.map(({ scenario, upperMechanics }) => {
                      const total = getMechanicTotal(upperMechanics, type);
                      return (
                        <td key={scenario.id} className="text-center px-4 py-3">
                          {total !== 0 ? (
                            <span className={total > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {total > 0 ? '+' : ''}{total.toFixed(1)} mm
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-3 text-slate-700">Final Upper Balance</td>
                  {comparisonData.map(({ upperBalance }) => (
                    <td key={upperBalance.arch + Math.random()} className="text-center px-4 py-3">
                      <span className={`px-2 py-1 rounded ${
                        upperBalance.status === 'balanced' ? 'bg-emerald-100 text-emerald-700' :
                        upperBalance.status === 'minor' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {upperBalance.finalBalance > 0 ? '+' : ''}{upperBalance.finalBalance.toFixed(1)} mm
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Lower mechanics by type */}
                <tr className="bg-slate-50">
                  <td colSpan={comparisonData.length + 1} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Lower Arch</td>
                </tr>
                {Array.from(allMechanicTypes).map((type) => (
                  <tr key={`lower-${type}`}>
                    <td className="px-4 py-3 text-slate-600">{type === 'INCISOR_MOVEMENT' ? 'Incisor Movement' : type.charAt(0) + type.slice(1).toLowerCase()}</td>
                    {comparisonData.map(({ scenario, lowerMechanics }) => {
                      const total = getMechanicTotal(lowerMechanics, type);
                      return (
                        <td key={scenario.id} className="text-center px-4 py-3">
                          {total !== 0 ? (
                            <span className={total > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {total > 0 ? '+' : ''}{total.toFixed(1)} mm
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-3 text-slate-700">Final Lower Balance</td>
                  {comparisonData.map(({ lowerBalance }) => (
                    <td key={lowerBalance.arch + Math.random()} className="text-center px-4 py-3">
                      <span className={`px-2 py-1 rounded ${
                        lowerBalance.status === 'balanced' ? 'bg-emerald-100 text-emerald-700' :
                        lowerBalance.status === 'minor' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {lowerBalance.finalBalance > 0 ? '+' : ''}{lowerBalance.finalBalance.toFixed(1)} mm
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Warnings count */}
                <tr>
                  <td className="px-4 py-3 text-slate-600">Warnings</td>
                  {comparisonData.map(({ scenario, warnings }) => (
                    <td key={scenario.id} className="text-center px-4 py-3">
                      {warnings.length > 0 ? (
                        <span className="text-amber-600">{warnings.length}</span>
                      ) : (
                        <span className="text-emerald-600">None</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Preferred selection */}
                <tr>
                  <td className="px-4 py-3 text-slate-600">Preferred</td>
                  {comparisonData.map(({ scenario }) => (
                    <td key={scenario.id} className="text-center px-4 py-3">
                      <button
                        onClick={() => handleTogglePreferred(scenario)}
                        className={`text-sm ${scenario.isPreferred ? 'text-amber-600 font-medium' : 'text-slate-400 hover:text-amber-600'}`}
                      >
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
                        <div
                          key={w.id}
                          className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                            w.level === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
                          }`}
                        >
                          <span>{w.message}</span>
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
                    ['Incisor advancement coefficient', 'incisorAdvancementCoefficient', 'mm/mm'],
                    ['Incisor retraction coefficient', 'incisorRetractionCoefficient', 'mm/mm'],
                    ['Extraction space utilization', 'extractionSpaceUtilization', '%'],
                    ['IPR warning threshold', 'iprWarningThreshold', 'mm'],
                    ['Balanced tolerance', 'balancedTolerance', '±mm'],
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
            OrthoMath does not rank treatment scenarios as "best". The clinician manually selects the preferred scenario.
          </p>
        </>
      )}
    </div>
  );
}
