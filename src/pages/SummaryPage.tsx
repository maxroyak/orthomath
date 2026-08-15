import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { Patient, DiagnosticRecord, TreatmentScenario } from '../domain/types';
import { store } from '../persistence/store';
import { PatientHeader } from '../components/layout/PatientHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { calculateSpaceBalance, resolveMechanicSpaceEffect, mechanicLabel, calculateExtractionTotalSpace, getExtractionAllocationTotal, getExtractionUnallocated } from '../domain/calculations/spaceBalance';
import { generateWarnings } from '../domain/warnings/warningEngine';
import { calculateBolton } from '../domain/calculations/bolton';

export function SummaryPage() {
  const { patientId } = useParams();
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

  const preferredScenario = scenarios.find((s) => s.isPreferred);
  const displayScenario = preferredScenario || scenarios[0];

  const summaryData = useMemo(() => {
    if (!diag || !displayScenario) return null;
    const resolvedMechanics = displayScenario.mechanics.map((m) => ({
      ...m,
      spaceEffect: resolveMechanicSpaceEffect(m, displayScenario.assumptions),
    }));
    const upperCrowding = diag.archMeasurements.find((a) => a.arch === 'upper')?.crowdingSpacing || 0;
    const lowerCrowding = diag.archMeasurements.find((a) => a.arch === 'lower')?.crowdingSpacing || 0;
    const upperBalance = calculateSpaceBalance(upperCrowding, resolvedMechanics, 'upper', settings.balancedTolerance, settings.minorDiscrepancyThreshold);
    const lowerBalance = calculateSpaceBalance(lowerCrowding, resolvedMechanics, 'lower', settings.balancedTolerance, settings.minorDiscrepancyThreshold);
    const warnings = generateWarnings([upperBalance, lowerBalance], resolvedMechanics, displayScenario.assumptions);
    const bolton = diag.includeBolton ? calculateBolton(diag.toothMeasurements, {
      boltonDiscrepancyTolerance: settings.boltonDiscrepancyTolerance,
      boltonRelevantThreshold: settings.boltonRelevantThreshold,
    }) : null;

    return { resolvedMechanics, upperBalance, lowerBalance, warnings, bolton };
  }, [diag, displayScenario, settings]);

  if (!patient) return <div className="text-slate-500">Patient not found.</div>;

  const upperCrowding = diag?.archMeasurements.find((a) => a.arch === 'upper')?.crowdingSpacing;
  const lowerCrowding = diag?.archMeasurements.find((a) => a.arch === 'lower')?.crowdingSpacing;

  const WARNING_STYLES: Record<string, string> = {
    info: 'bg-blue-50 text-blue-800',
    review: 'bg-amber-50 text-amber-800',
    conflict: 'bg-rose-50 text-rose-800',
  };

  return (
    <div>
      <PatientHeader patient={patient} />

      <div className="flex items-center justify-between mb-6 no-print">
        <h2 className="text-xl font-bold text-slate-900">Treatment Planning Summary</h2>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print / PDF
        </Button>
      </div>

      {!displayScenario || !summaryData ? (
        <Card>
          <EmptyState
            title="No scenario to summarize"
            description="Create and select a treatment scenario to generate a summary."
          />
        </Card>
      ) : (
        <Card className="print-page p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-2xl font-bold text-slate-900">OrthoMath Treatment Planning Summary</h1>
              <p className="text-sm text-slate-400 mt-1">Generated {new Date().toLocaleDateString()}</p>
            </div>

            {/* Patient info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-400">Patient:</span> <span className="font-medium text-slate-800">{patient.name}</span></div>
              <div><span className="text-slate-400">Age:</span> <span className="font-medium text-slate-800">{patient.age || '—'} y</span></div>
              <div><span className="text-slate-400">Dentition:</span> <span className="font-medium text-slate-800">{patient.dentitionStage === 'mixed' ? 'Mixed' : 'Permanent'}</span></div>
              <div><span className="text-slate-400">Selected scenario:</span> <span className="font-medium text-slate-800">{displayScenario.name}{preferredScenario ? ' (Preferred by clinician)' : ''}</span></div>
            </div>

            {/* Discrepancies */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs text-slate-400">Upper discrepancy</div>
                <div className={`text-lg font-bold ${upperCrowding && upperCrowding < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {upperCrowding !== undefined ? `${upperCrowding > 0 ? '+' : ''}${upperCrowding.toFixed(1)} mm` : '—'}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs text-slate-400">Lower discrepancy</div>
                <div className={`text-lg font-bold ${lowerCrowding && lowerCrowding < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {lowerCrowding !== undefined ? `${lowerCrowding > 0 ? '+' : ''}${lowerCrowding.toFixed(1)} mm` : '—'}
                </div>
              </div>
            </div>

            {/* Upper mechanics */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Upper Mechanics</h3>
              <div className="space-y-1 text-sm">
                {summaryData.resolvedMechanics.filter((m) => m.arch === 'upper').map((m) => (
                  <div key={m.id} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">{mechanicLabel(m)}</span>
                    <span className={m.spaceEffect >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                      {m.spaceEffect > 0 ? '+' : ''}{m.spaceEffect.toFixed(1)} mm
                    </span>
                  </div>
                ))}
                {summaryData.resolvedMechanics.filter((m) => m.arch === 'upper').length === 0 && (
                  <p className="text-slate-400 italic">No upper arch mechanics</p>
                )}
                <div className="flex justify-between py-2 font-semibold">
                  <span className="text-slate-700">Final balance</span>
                  <span className={summaryData.upperBalance.status === 'balanced' ? 'text-emerald-600' : summaryData.upperBalance.status === 'minor' ? 'text-amber-600' : 'text-rose-600'}>
                    {summaryData.upperBalance.finalBalance > 0 ? '+' : ''}{summaryData.upperBalance.finalBalance.toFixed(1)} mm
                  </span>
                </div>
              </div>
            </div>

            {/* Lower mechanics */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Lower Mechanics</h3>
              <div className="space-y-1 text-sm">
                {summaryData.resolvedMechanics.filter((m) => m.arch === 'lower').map((m) => (
                  <div key={m.id} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">{mechanicLabel(m)}</span>
                    <span className={m.spaceEffect >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                      {m.spaceEffect > 0 ? '+' : ''}{m.spaceEffect.toFixed(1)} mm
                    </span>
                  </div>
                ))}
                {summaryData.resolvedMechanics.filter((m) => m.arch === 'lower').length === 0 && (
                  <p className="text-slate-400 italic">No lower arch mechanics</p>
                )}
                <div className="flex justify-between py-2 font-semibold">
                  <span className="text-slate-700">Final balance</span>
                  <span className={summaryData.lowerBalance.status === 'balanced' ? 'text-emerald-600' : summaryData.lowerBalance.status === 'minor' ? 'text-amber-600' : 'text-rose-600'}>
                    {summaryData.lowerBalance.finalBalance > 0 ? '+' : ''}{summaryData.lowerBalance.finalBalance.toFixed(1)} mm
                  </span>
                </div>
              </div>
            </div>

            {/* Extraction allocation detail */}
            {summaryData.resolvedMechanics.filter((m) => m.type === 'EXTRACTION').map((m) => {
              const total = calculateExtractionTotalSpace(Object.values(m.parameters.toothWidths || {}));
              const allocTotal = getExtractionAllocationTotal(m.parameters.extractionAllocation);
              const unallocated = getExtractionUnallocated(total, m.parameters.extractionAllocation);
              if (total === 0) return null;
              return (
                <div key={m.id}>
                  <h3 className="font-semibold text-slate-900 mb-2">Extraction Allocation — {m.arch === 'upper' ? 'Upper' : 'Lower'} Arch</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Total extraction space</span><span className="font-medium">{total.toFixed(1)} mm</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Allocated to alignment</span><span className="font-medium">{(m.parameters.extractionAllocation?.alignment || 0).toFixed(1)} mm</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Total allocated</span><span className="font-medium">{allocTotal.toFixed(1)} mm</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Unallocated</span><span className={`font-medium ${unallocated > 0.01 ? 'text-amber-600' : unallocated < -0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>{unallocated > 0 ? '+' : ''}{unallocated.toFixed(1)} mm</span></div>
                  </div>
                </div>
              );
            })}

            {/* Bolton */}
            {summaryData.bolton && (summaryData.bolton.anterior || summaryData.bolton.overall) && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Bolton Analysis</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {summaryData.bolton.anterior && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-400">Anterior ratio</div>
                      <div className="font-medium">{summaryData.bolton.anterior.ratio}% (ref: 77.2%)</div>
                      <div className="text-xs text-slate-500 mt-1">Discrepancy: {summaryData.bolton.anterior.discrepancyMm} mm — {summaryData.bolton.anterior.discrepancyDirection.replace('_', ' ')}</div>
                    </div>
                  )}
                  {summaryData.bolton.overall && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-400">Overall ratio</div>
                      <div className="font-medium">{summaryData.bolton.overall.ratio}% (ref: 91.3%)</div>
                      <div className="text-xs text-slate-500 mt-1">Discrepancy: {summaryData.bolton.overall.discrepancyMm} mm — {summaryData.bolton.overall.discrepancyDirection.replace('_', ' ')}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assumptions */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Planning Assumptions</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                <div>Expansion coefficient: {displayScenario.assumptions.expansionCoefficient}</div>
                <div>Incisor advancement coefficient: {displayScenario.assumptions.incisorAdvancementCoefficient}</div>
                <div>Incisor retraction coefficient: {displayScenario.assumptions.incisorRetractionCoefficient}</div>
                <div>Balanced tolerance: ±{displayScenario.assumptions.balancedTolerance} mm</div>
                <div>IPR warning threshold: {displayScenario.assumptions.iprWarningThreshold} mm/contact</div>
              </div>
            </div>

            {/* Cephalometric values */}
            {diag?.cephalometric && Object.keys(diag.cephalometric).length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Cephalometric Values</h3>
                <div className="grid grid-cols-4 gap-2 text-sm text-slate-600">
                  {Object.entries(diag.cephalometric).filter(([, v]) => v !== undefined && v !== '').map(([key, val]) => (
                    <div key={key}>
                      <span className="text-slate-400">{key}:</span> <span className="font-medium">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {summaryData.warnings.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Warnings</h3>
                <div className="space-y-2">
                  {summaryData.warnings.map((w) => (
                    <div key={w.id} className={`p-3 rounded-lg text-sm ${WARNING_STYLES[w.level]}`}>
                      <span className="font-medium text-xs uppercase mr-2">
                        {w.level === 'conflict' ? 'Conflict' : w.level === 'review' ? 'Review' : 'Info'}
                      </span>
                      {w.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical notes */}
            {displayScenario.clinicalNotes && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Clinical Notes</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{displayScenario.clinicalNotes}</p>
              </div>
            )}

            {/* Footer disclaimer */}
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-400 italic">
                OrthoMath is a clinical calculation and treatment-planning support tool intended for
                qualified dental professionals. It does not provide a diagnosis or prescribe treatment.
                All calculations and assumptions must be interpreted and verified by the treating clinician.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}