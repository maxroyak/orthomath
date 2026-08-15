import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Patient, DiagnosticRecord, TreatmentScenario } from '../domain/types';
import { store } from '../persistence/store';
import { PatientHeader } from '../components/layout/PatientHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BalanceBar } from '../components/ui/BalanceBar';
import { EmptyState } from '../components/ui/EmptyState';
import { calculateSpaceBalance, resolveMechanicSpaceEffect } from '../domain/calculations/spaceBalance';
import { generateWarnings } from '../domain/warnings/warningEngine';

export function SpaceAnalysisPage() {
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

  // Calculate space balance for each scenario
  const scenarioResults = useMemo(() => {
    if (!diag) return [];
    return scenarios.map((scenario) => {
      // Recalculate all mechanic effects with current assumptions
      const resolvedMechanics = scenario.mechanics.map((m) => ({
        ...m,
        spaceEffect: resolveMechanicSpaceEffect(m, scenario.assumptions),
      }));

      const upperCrowding = diag.archMeasurements.find((a) => a.arch === 'upper')?.crowdingSpacing || 0;
      const lowerCrowding = diag.archMeasurements.find((a) => a.arch === 'lower')?.crowdingSpacing || 0;

      const upperBalance = calculateSpaceBalance(
        upperCrowding,
        resolvedMechanics,
        'upper',
        settings.balancedTolerance,
        settings.minorDiscrepancyThreshold,
      );
      const lowerBalance = calculateSpaceBalance(
        lowerCrowding,
        resolvedMechanics,
        'lower',
        settings.balancedTolerance,
        settings.minorDiscrepancyThreshold,
      );

      const warnings = generateWarnings([upperBalance, lowerBalance], resolvedMechanics, scenario.assumptions);

      return { scenario, upperBalance, lowerBalance, warnings, resolvedMechanics };
    });
  }, [diag, scenarios, settings]);

  if (!patient) return <div className="text-slate-500">Patient not found.</div>;

  const upperCrowding = diag?.archMeasurements.find((a) => a.arch === 'upper')?.crowdingSpacing;
  const lowerCrowding = diag?.archMeasurements.find((a) => a.arch === 'lower')?.crowdingSpacing;

  return (
    <div>
      <PatientHeader patient={patient} />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Space Analysis</h2>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/patient/${patientId}/scenarios`)}>
          Next: Treatment Scenarios →
        </Button>
      </div>

      {/* Starting discrepancies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card title="Upper Arch Starting Discrepancy">
          <div className="px-6 py-4">
            {upperCrowding !== undefined ? (
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${upperCrowding < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {upperCrowding > 0 ? '+' : ''}{upperCrowding.toFixed(1)}
                </span>
                <span className="text-sm text-slate-400">mm</span>
                <span className="text-sm text-slate-500 ml-2">
                  {upperCrowding < 0 ? 'Crowding' : 'Spacing'}
                </span>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No upper arch data. Enter diagnostics first.</p>
            )}
          </div>
        </Card>
        <Card title="Lower Arch Starting Discrepancy">
          <div className="px-6 py-4">
            {lowerCrowding !== undefined ? (
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${lowerCrowding < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {lowerCrowding > 0 ? '+' : ''}{lowerCrowding.toFixed(1)}
                </span>
                <span className="text-sm text-slate-400">mm</span>
                <span className="text-sm text-slate-500 ml-2">
                  {lowerCrowding < 0 ? 'Crowding' : 'Spacing'}
                </span>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No lower arch data. Enter diagnostics first.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Per-scenario balance */}
      {scenarioResults.length === 0 ? (
        <Card>
          <EmptyState
            title="No treatment scenarios yet"
            description="Create your first treatment scenario to see how different mechanics affect available space."
            action={<Button onClick={() => navigate(`/patient/${patientId}/scenarios`)}>Create scenario</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {scenarioResults.map(({ scenario, upperBalance, lowerBalance, warnings }) => (
            <Card key={scenario.id} title={scenario.name + (scenario.isPreferred ? ' ★ Preferred' : '')}>
              <div className="px-6 py-4 space-y-6">
                {/* Upper balance */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Upper Arch</h4>
                  <BalanceBar result={upperBalance} />
                </div>
                {/* Lower balance */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Lower Arch</h4>
                  <BalanceBar result={lowerBalance} />
                </div>
                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-700">Warnings</h4>
                    {warnings.map((w) => (
                      <div
                        key={w.id}
                        className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                          w.level === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
                        }`}
                      >
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
