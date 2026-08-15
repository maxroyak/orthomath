import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type {
  Patient, DiagnosticRecord, TreatmentScenario, TreatmentMechanic,
  MechanicType, Arch, CalculationAssumptions,
} from '../domain/types';
import { store } from '../persistence/store';
import { PatientHeader } from '../components/layout/PatientHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { BalanceBar } from '../components/ui/BalanceBar';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import {
  calculateSpaceBalance, resolveMechanicSpaceEffect,
  calculateIPREffect,
} from '../domain/calculations/spaceBalance';
import { generateWarnings } from '../domain/warnings/warningEngine';
import { duplicateScenario, reassignMechanicIds } from '../domain/scenarios/scenarioEngine';

const MECHANIC_TYPES: { type: MechanicType; label: string; description: string }[] = [
  { type: 'IPR', label: 'IPR', description: 'Interproximal reduction' },
  { type: 'EXPANSION', label: 'Expansion', description: 'Arch expansion' },
  { type: 'DISTALIZATION', label: 'Distalization', description: 'Distal movement of posterior teeth' },
  { type: 'EXTRACTION', label: 'Extraction', description: 'Tooth extraction' },
  { type: 'INCISOR_MOVEMENT', label: 'Incisor Movement', description: 'Advancement or retraction' },
  { type: 'CUSTOM', label: 'Custom', description: 'Custom space adjustment' },
];

export function ScenariosPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | undefined>();
  const [diag, setDiag] = useState<DiagnosticRecord | undefined>();
  const [scenarios, setScenarios] = useState<TreatmentScenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [showNewScenario, setShowNewScenario] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [showAddMechanic, setShowAddMechanic] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState<string | null>(null);
  const [dupName, setDupName] = useState('');

  const settings = useMemo(() => store.getSettings(), []);

  const refresh = useCallback(() => {
    if (!patientId) return;
    setPatient(store.getPatient(patientId));
    setDiag(store.getDiagnostic(patientId));
    const sc = store.getScenarios(patientId);
    setScenarios(sc);
    if (!activeScenarioId && sc.length > 0) {
      setActiveScenarioId(sc[0].id);
    }
  }, [patientId, activeScenarioId]);

  useEffect(() => { refresh(); }, [refresh]);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  // Calculate balances for active scenario
  const activeResult = useMemo(() => {
    if (!activeScenario || !diag) return null;
    const resolvedMechanics = activeScenario.mechanics.map((m) => ({
      ...m,
      spaceEffect: resolveMechanicSpaceEffect(m, activeScenario.assumptions),
    }));
    const upperCrowding = diag.archMeasurements.find((a) => a.arch === 'upper')?.crowdingSpacing || 0;
    const lowerCrowding = diag.archMeasurements.find((a) => a.arch === 'lower')?.crowdingSpacing || 0;
    const upperBalance = calculateSpaceBalance(upperCrowding, resolvedMechanics, 'upper', settings.balancedTolerance, settings.minorDiscrepancyThreshold);
    const lowerBalance = calculateSpaceBalance(lowerCrowding, resolvedMechanics, 'lower', settings.balancedTolerance, settings.minorDiscrepancyThreshold);
    const warnings = generateWarnings([upperBalance, lowerBalance], resolvedMechanics, activeScenario.assumptions);
    return { upperBalance, lowerBalance, warnings, resolvedMechanics };
  }, [activeScenario, diag, settings]);

  const handleCreateScenario = () => {
    if (!patientId) return;
    const now = new Date().toISOString();
    const name = newScenarioName.trim() || `Scenario ${String.fromCharCode(65 + scenarios.length)}`;
    const scenario: TreatmentScenario = {
      id: crypto.randomUUID(),
      patientId,
      name,
      isPreferred: false,
      mechanics: [],
      assumptions: { ...settings.defaultAssumptions },
      clinicalNotes: '',
      createdAt: now,
      updatedAt: now,
    };
    store.saveScenario(scenario);
    setShowNewScenario(false);
    setNewScenarioName('');
    setActiveScenarioId(scenario.id);
    refresh();
  };

  const handleDuplicate = (scenarioId: string) => {
    const original = scenarios.find((s) => s.id === scenarioId);
    if (!original) return;
    const dup = duplicateScenario(original, dupName || `${original.name} (copy)`);
    const finalDup = reassignMechanicIds(dup, dup.id);
    store.saveScenario(finalDup);
    setShowDuplicate(null);
    setDupName('');
    setActiveScenarioId(finalDup.id);
    refresh();
  };

  const handleDeleteScenario = (id: string, name: string) => {
    if (confirm(`Delete scenario "${name}"? This cannot be undone.`)) {
      store.deleteScenario(id);
      if (activeScenarioId === id) setActiveScenarioId(null);
      refresh();
    }
  };

  const handleTogglePreferred = (scenario: TreatmentScenario) => {
    store.saveScenario({ ...scenario, isPreferred: !scenario.isPreferred });
    refresh();
  };

  const handleUpdateScenario = (updated: TreatmentScenario) => {
    store.saveScenario(updated);
    refresh();
  };

  const handleAddMechanic = (type: MechanicType, arch: Arch) => {
    if (!activeScenario) return;
    const newMechanic: TreatmentMechanic = {
      id: crypto.randomUUID(),
      scenarioId: activeScenario.id,
      type,
      arch,
      parameters: {},
      spaceEffect: 0,
    };
    const updated = {
      ...activeScenario,
      mechanics: [...activeScenario.mechanics, newMechanic],
    };
    handleUpdateScenario(updated);
    setShowAddMechanic(false);
  };

  const handleUpdateMechanic = (mechanicId: string, params: Partial<TreatmentMechanic['parameters']>) => {
    if (!activeScenario) return;
    const updated = {
      ...activeScenario,
      mechanics: activeScenario.mechanics.map((m) => {
        if (m.id !== mechanicId) return m;
        const newParams = { ...m.parameters, ...params };
        const newMechanic = { ...m, parameters: newParams };
        newMechanic.spaceEffect = resolveMechanicSpaceEffect(newMechanic, activeScenario.assumptions);
        return newMechanic;
      }),
    };
    handleUpdateScenario(updated);
  };

  const handleDeleteMechanic = (mechanicId: string) => {
    if (!activeScenario) return;
    const updated = {
      ...activeScenario,
      mechanics: activeScenario.mechanics.filter((m) => m.id !== mechanicId),
    };
    handleUpdateScenario(updated);
  };

  if (!patient) return <div className="text-slate-500">Patient not found.</div>;

  return (
    <div>
      <PatientHeader patient={patient} />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Treatment Scenarios</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/patient/${patientId}/comparison`)}>
            Compare →
          </Button>
          <Button size="sm" onClick={() => setShowNewScenario(true)}>
            + New Scenario
          </Button>
        </div>
      </div>

      {scenarios.length === 0 ? (
        <Card>
          <EmptyState
            title="No treatment scenarios yet"
            description="Create your first treatment scenario to see how different mechanics affect available space."
            action={<Button onClick={() => setShowNewScenario(true)}>Create scenario</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scenario list */}
          <div className="lg:col-span-1 space-y-2">
            {scenarios.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveScenarioId(s.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  s.id === activeScenarioId
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{s.name}</h3>
                      {s.isPreferred && <span className="text-amber-500 text-sm" title="Preferred by clinician">★</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {s.mechanics.length} mechanic{s.mechanics.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTogglePreferred(s); }}
                    className="text-xs text-slate-500 hover:text-amber-600"
                  >
                    {s.isPreferred ? 'Unprefer' : 'Set preferred'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDuplicate(s.id); setDupName(`${s.name} — copy`); }}
                    className="text-xs text-slate-500 hover:text-primary-600"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteScenario(s.id, s.name); }}
                    className="text-xs text-slate-500 hover:text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Active scenario detail */}
          <div className="lg:col-span-2 space-y-6">
            {activeScenario && activeResult && (
              <>
                {/* Scenario header */}
                <Card>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={activeScenario.name}
                        onChange={(e) => handleUpdateScenario({ ...activeScenario, name: e.target.value })}
                        className="text-lg font-semibold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 -ml-1 px-1"
                      />
                      <input
                        type="text"
                        value={activeScenario.description || ''}
                        onChange={(e) => handleUpdateScenario({ ...activeScenario, description: e.target.value })}
                        placeholder="Add description..."
                        className="block text-sm text-slate-500 bg-transparent border-none focus:outline-none focus:ring-0 -ml-1 px-1 mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setShowAddMechanic(true)}>
                        + Add Mechanic
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Space balance */}
                <Card title="Space Balance">
                  <div className="px-6 py-4 space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-3">Upper Arch</h4>
                      <BalanceBar result={activeResult.upperBalance} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-3">Lower Arch</h4>
                      <BalanceBar result={activeResult.lowerBalance} />
                    </div>
                  </div>
                </Card>

                {/* Mechanics list */}
                <Card title={`Mechanics (${activeScenario.mechanics.length})`}>
                  <div className="divide-y divide-slate-100">
                    {activeScenario.mechanics.length === 0 ? (
                      <div className="px-6 py-8 text-center">
                        <p className="text-sm text-slate-400 mb-4">No mechanics added yet.</p>
                        <Button size="sm" onClick={() => setShowAddMechanic(true)}>+ Add Mechanic</Button>
                      </div>
                    ) : (
                      activeScenario.mechanics.map((m) => (
                        <MechanicEditor
                          key={m.id}
                          mechanic={m}
                          assumptions={activeScenario.assumptions}
                          onUpdate={(params) => handleUpdateMechanic(m.id, params)}
                          onDelete={() => handleDeleteMechanic(m.id)}
                        />
                      ))
                    )}
                  </div>
                </Card>

                {/* Assumptions */}
                <Card title="Assumptions">
                  <div className="px-6 py-4 grid grid-cols-2 gap-4 text-sm">
                    <AssumptionRow
                      label="Expansion coefficient"
                      value={activeScenario.assumptions.expansionCoefficient}
                      unit="mm/mm"
                      onChange={(v) => handleUpdateScenario({ ...activeScenario, assumptions: { ...activeScenario.assumptions, expansionCoefficient: v } })}
                    />
                    <AssumptionRow
                      label="Incisor advancement coefficient"
                      value={activeScenario.assumptions.incisorAdvancementCoefficient}
                      unit="mm/mm"
                      onChange={(v) => handleUpdateScenario({ ...activeScenario, assumptions: { ...activeScenario.assumptions, incisorAdvancementCoefficient: v } })}
                    />
                    <AssumptionRow
                      label="Incisor retraction coefficient"
                      value={activeScenario.assumptions.incisorRetractionCoefficient}
                      unit="mm/mm"
                      onChange={(v) => handleUpdateScenario({ ...activeScenario, assumptions: { ...activeScenario.assumptions, incisorRetractionCoefficient: v } })}
                    />
                    <AssumptionRow
                      label="Extraction space utilization"
                      value={activeScenario.assumptions.extractionSpaceUtilization}
                      unit="%"
                      onChange={(v) => handleUpdateScenario({ ...activeScenario, assumptions: { ...activeScenario.assumptions, extractionSpaceUtilization: v } })}
                    />
                    <AssumptionRow
                      label="IPR warning threshold"
                      value={activeScenario.assumptions.iprWarningThreshold}
                      unit="mm/contact"
                      onChange={(v) => handleUpdateScenario({ ...activeScenario, assumptions: { ...activeScenario.assumptions, iprWarningThreshold: v } })}
                    />
                    <AssumptionRow
                      label="Balanced tolerance"
                      value={activeScenario.assumptions.balancedTolerance}
                      unit="±mm"
                      onChange={(v) => handleUpdateScenario({ ...activeScenario, assumptions: { ...activeScenario.assumptions, balancedTolerance: v } })}
                    />
                  </div>
                </Card>

                {/* Warnings */}
                {activeResult.warnings.length > 0 && (
                  <Card title="Warnings">
                    <div className="px-6 py-4 space-y-2">
                      {activeResult.warnings.map((w) => (
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
                  </Card>
                )}

                {/* Clinical notes */}
                <Card title="Clinical Notes">
                  <div className="px-6 py-4">
                    <textarea
                      value={activeScenario.clinicalNotes || ''}
                      onChange={(e) => handleUpdateScenario({ ...activeScenario, clinicalNotes: e.target.value })}
                      placeholder="Anchorage considerations, periodontal limitations, patient preferences, profile considerations, TMJ considerations, vertical control, asymmetry..."
                      rows={5}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 resize-y"
                    />
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* New Scenario Modal */}
      <Modal
        open={showNewScenario}
        onClose={() => setShowNewScenario(false)}
        title="New Treatment Scenario"
        footer={<><Button variant="secondary" onClick={() => setShowNewScenario(false)}>Cancel</Button><Button onClick={handleCreateScenario}>Create</Button></>}
      >
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Scenario name</label>
          <input
            type="text"
            value={newScenarioName}
            onChange={(e) => setNewScenarioName(e.target.value)}
            placeholder="e.g. Non-extraction, Extraction 14/24..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            autoFocus
          />
        </div>
      </Modal>

      {/* Duplicate Modal */}
      <Modal
        open={showDuplicate !== null}
        onClose={() => setShowDuplicate(null)}
        title="Duplicate Scenario"
        footer={<><Button variant="secondary" onClick={() => setShowDuplicate(null)}>Cancel</Button><Button onClick={() => showDuplicate && handleDuplicate(showDuplicate)}>Duplicate</Button></>}
      >
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">New scenario name</label>
          <input
            type="text"
            value={dupName}
            onChange={(e) => setDupName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            autoFocus
          />
        </div>
      </Modal>

      {/* Add Mechanic Modal */}
      <Modal
        open={showAddMechanic}
        onClose={() => setShowAddMechanic(false)}
        title="Add Treatment Mechanic"
      >
        <div className="space-y-3">
          {MECHANIC_TYPES.map((mt) => (
            <div key={mt.type} className="grid grid-cols-2 gap-2">
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="font-medium text-slate-800 text-sm">{mt.label}</div>
                <div className="text-xs text-slate-400">{mt.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleAddMechanic(mt.type, 'upper')} className="flex-1">Upper</Button>
                <Button size="sm" variant="secondary" onClick={() => handleAddMechanic(mt.type, 'lower')} className="flex-1">Lower</Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

// ── Mechanic Editor Component ───────────────────────────────────────────────

function MechanicEditor({
  mechanic,
  assumptions,
  onUpdate,
  onDelete,
}: {
  mechanic: TreatmentMechanic;
  assumptions: CalculationAssumptions;
  onUpdate: (params: Partial<TreatmentMechanic['parameters']>) => void;
  onDelete: () => void;
}) {
  const p = mechanic.parameters;
  const archLabel = mechanic.arch === 'upper' ? 'Upper' : 'Lower';

  let formulaStr = '';
  let inputsStr = '';
  let resultStr = '';

  switch (mechanic.type) {
    case 'IPR':
      formulaStr = 'IPR per contact × number of contacts';
      inputsStr = `${p.iprPerContact || 0} mm × ${p.numberOfContacts || 0} contacts`;
      resultStr = `${calculateIPREffect(p.iprPerContact || 0, p.numberOfContacts || 0).toFixed(1)} mm`;
      break;
    case 'EXPANSION':
      if (p.expansionMode === 'manual') {
        formulaStr = 'Manual space gain entry';
        inputsStr = `${p.manualSpaceGain || 0} mm`;
      } else {
        formulaStr = 'Expansion amount × coefficient';
        inputsStr = `${p.expansionAmount || 0} mm × ${p.expansionCoefficient ?? assumptions.expansionCoefficient}`;
      }
      resultStr = `${mechanic.spaceEffect.toFixed(1)} mm`;
      break;
    case 'DISTALIZATION':
      formulaStr = 'Right + Left distalization (or manual usable space)';
      inputsStr = `${p.rightDistalization || 0} + ${p.leftDistalization || 0} mm`;
      resultStr = `${mechanic.spaceEffect.toFixed(1)} mm`;
      break;
    case 'EXTRACTION':
      formulaStr = 'Σ tooth widths × utilization %';
      inputsStr = `${Object.values(p.toothWidths || {}).reduce((s, w) => s + w, 0).toFixed(1)} mm × ${p.extractionUtilizationPercent ?? assumptions.extractionSpaceUtilization}%`;
      resultStr = `${mechanic.spaceEffect.toFixed(1)} mm`;
      break;
    case 'INCISOR_MOVEMENT':
      formulaStr = 'Incisor movement × coefficient';
      inputsStr = `${p.incisorMovement || 0} mm × ${p.incisorCoefficient ?? (p.incisorMovement && p.incisorMovement > 0 ? assumptions.incisorAdvancementCoefficient : assumptions.incisorRetractionCoefficient)}`;
      resultStr = `${mechanic.spaceEffect.toFixed(1)} mm`;
      break;
    case 'CUSTOM':
      formulaStr = 'Manual entry';
      inputsStr = `${p.customSpaceEffect || 0} mm`;
      resultStr = `${mechanic.spaceEffect.toFixed(1)} mm`;
      break;
  }

  const typeLabel = MECHANIC_TYPES.find((mt) => mt.type === mechanic.type)?.label || mechanic.type;

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 text-sm">{typeLabel}</span>
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">{archLabel}</span>
          <InfoTooltip label={typeLabel} formula={formulaStr} inputs={inputsStr} result={resultStr} />
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${mechanic.spaceEffect >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {mechanic.spaceEffect > 0 ? '+' : ''}{mechanic.spaceEffect.toFixed(1)} mm
          </span>
          <button onClick={onDelete} className="text-slate-400 hover:text-rose-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
          </button>
        </div>
      </div>

      {/* Type-specific inputs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {mechanic.type === 'IPR' && (
          <>
            <NumberInput label="IPR per contact" value={p.iprPerContact} onChange={(v) => onUpdate({ iprPerContact: v })} unit="mm" step={0.05} />
            <NumberInput label="Number of contacts" value={p.numberOfContacts} onChange={(v) => onUpdate({ numberOfContacts: v })} unit="" step={1} />
          </>
        )}

        {mechanic.type === 'EXPANSION' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Mode</label>
              <select
                value={p.expansionMode || 'calculated'}
                onChange={(e) => onUpdate({ expansionMode: e.target.value as 'manual' | 'calculated' })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value="calculated">Calculated</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            {p.expansionMode === 'manual' ? (
              <NumberInput label="Estimated space gain" value={p.manualSpaceGain} onChange={(v) => onUpdate({ manualSpaceGain: v })} unit="mm" />
            ) : (
              <>
                <NumberInput label="Expansion amount" value={p.expansionAmount} onChange={(v) => onUpdate({ expansionAmount: v })} unit="mm" />
                <NumberInput label="Coefficient" value={p.expansionCoefficient ?? assumptions.expansionCoefficient} onChange={(v) => onUpdate({ expansionCoefficient: v })} unit="mm/mm" />
              </>
            )}
          </>
        )}

        {mechanic.type === 'DISTALIZATION' && (
          <>
            <NumberInput label="Right distalization" value={p.rightDistalization} onChange={(v) => onUpdate({ rightDistalization: v })} unit="mm" />
            <NumberInput label="Left distalization" value={p.leftDistalization} onChange={(v) => onUpdate({ leftDistalization: v })} unit="mm" />
            <NumberInput label="Expected usable space (optional)" value={p.expectedUsableSpace} onChange={(v) => onUpdate({ expectedUsableSpace: v })} unit="mm" />
          </>
        )}

        {mechanic.type === 'EXTRACTION' && (
          <>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Extracted teeth (FDI, comma-separated)</label>
              <input
                type="text"
                value={(p.extractedTeeth || []).join(', ')}
                onChange={(e) => {
                  const teeth = e.target.value.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n) && n > 0);
                  onUpdate({ extractedTeeth: teeth });
                }}
                placeholder="e.g. 14, 24"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <NumberInput label="Utilization %" value={p.extractionUtilizationPercent ?? assumptions.extractionSpaceUtilization} onChange={(v) => onUpdate({ extractionUtilizationPercent: v })} unit="%" />
            <div className="text-xs text-slate-400 self-end pb-2">
              Total: {Object.values(p.toothWidths || {}).reduce((s, w) => s + w, 0).toFixed(1)} mm → {mechanic.spaceEffect.toFixed(1)} mm usable
            </div>
          </>
        )}

        {mechanic.type === 'INCISOR_MOVEMENT' && (
          <>
            <NumberInput label="Movement (+advance / −retract)" value={p.incisorMovement} onChange={(v) => onUpdate({ incisorMovement: v })} unit="mm" />
            <NumberInput label="Coefficient" value={p.incisorCoefficient ?? (p.incisorMovement && p.incisorMovement > 0 ? assumptions.incisorAdvancementCoefficient : assumptions.incisorRetractionCoefficient)} onChange={(v) => onUpdate({ incisorCoefficient: v })} unit="mm/mm" />
          </>
        )}

        {mechanic.type === 'CUSTOM' && (
          <>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
              <input
                type="text"
                value={p.customName || ''}
                onChange={(e) => onUpdate({ customName: e.target.value })}
                placeholder="e.g. Derotation of posterior teeth"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <NumberInput label="Space effect" value={p.customSpaceEffect} onChange={(v) => onUpdate({ customSpaceEffect: v })} unit="mm" />
          </>
        )}
      </div>

      {/* Extraction tooth widths */}
      {mechanic.type === 'EXTRACTION' && (p.extractedTeeth || []).length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-400 mb-2">Mesiodistal widths of extracted teeth (mm):</div>
          <div className="grid grid-cols-4 gap-2">
            {(p.extractedTeeth || []).map((fdi) => (
              <NumberInput
                key={fdi}
                label={`#${fdi}`}
                value={p.toothWidths?.[fdi]}
                onChange={(v) => {
                  const widths = { ...(p.toothWidths || {}) };
                  if (v === undefined) delete widths[fdi];
                  else widths[fdi] = v;
                  onUpdate({ toothWidths: widths });
                }}
                unit="mm"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assumption Row Component ────────────────────────────────────────────────

function AssumptionRow({
  label, value, unit, onChange,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-slate-600">{label}</label>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={String(value)}
          onChange={(e) => {
            const v = parseFloat(e.target.value.replace(',', '.'));
            if (!isNaN(v)) onChange(v);
          }}
          className="w-20 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <span className="text-xs text-slate-400">Assumption used when this scenario was calculated</span>
      </div>
    </div>
  );
}