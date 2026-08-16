import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type {
  Patient, DiagnosticRecord, TreatmentScenario, TreatmentMechanic,
  MechanicType, Arch, CalculationAssumptions, ExtractionAllocation,
  ToothMeasurement,
} from '../domain/types';
import { store } from '../persistence/store';
import { PatientHeader } from '../components/layout/PatientHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { PatientNotFound } from '../components/ui/PatientNotFound';
import { BalanceChain } from '../components/ui/BalanceChain';
import {
  calculateSpaceBalance, resolveMechanicSpaceEffect,
  calculateExtractionTotalSpace, getExtractionAllocationTotal,
  getExtractionUnallocated,
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

const WARNING_STYLES: Record<string, string> = {
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  review: 'bg-amber-50 text-amber-800 border-amber-200',
  conflict: 'bg-rose-50 text-rose-800 border-rose-200',
};

const WARNING_LABELS: Record<string, string> = {
  info: 'Information',
  review: 'Review',
  conflict: 'Calculation conflict',
};

export function ScenariosPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | undefined>();
  const [diag, setDiag] = useState<DiagnosticRecord | undefined>();
  const [scenarios, setScenarios] = useState<TreatmentScenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [showNewScenario, setShowNewScenario] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDesc, setNewScenarioDesc] = useState('');
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
    // Auto-select first scenario if none selected and scenarios exist
    setActiveScenarioId((prev) => prev && sc.some((s) => s.id === prev) ? prev : (sc.length > 0 ? sc[0].id : null));
  }, [patientId]);

  useEffect(() => { refresh(); }, [refresh]);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  const upperCrowding = diag?.archMeasurements.find((a) => a.arch === 'upper')?.crowdingSpacing ?? 0;
  const lowerCrowding = diag?.archMeasurements.find((a) => a.arch === 'lower')?.crowdingSpacing ?? 0;

  // Calculate balances for active scenario in real time
  const activeResult = useMemo(() => {
    if (!activeScenario) return null;
    const resolvedMechanics = activeScenario.mechanics.map((m) => ({
      ...m,
      spaceEffect: resolveMechanicSpaceEffect(m, activeScenario.assumptions),
    }));
    const upperBalance = calculateSpaceBalance(upperCrowding, resolvedMechanics, 'upper', settings.balancedTolerance, settings.minorDiscrepancyThreshold);
    const lowerBalance = calculateSpaceBalance(lowerCrowding, resolvedMechanics, 'lower', settings.balancedTolerance, settings.minorDiscrepancyThreshold);
    const warnings = generateWarnings([upperBalance, lowerBalance], resolvedMechanics, activeScenario.assumptions);
    return { upperBalance, lowerBalance, warnings, resolvedMechanics };
  }, [activeScenario, upperCrowding, lowerCrowding, settings]);

  // Compact results for scenario list
  const scenarioResults = useMemo(() => {
    return scenarios.map((s) => {
      const resolved = s.mechanics.map((m) => ({ ...m, spaceEffect: resolveMechanicSpaceEffect(m, s.assumptions) }));
      const ub = calculateSpaceBalance(upperCrowding, resolved, 'upper', settings.balancedTolerance, settings.minorDiscrepancyThreshold);
      const lb = calculateSpaceBalance(lowerCrowding, resolved, 'lower', settings.balancedTolerance, settings.minorDiscrepancyThreshold);
      return { scenario: s, upperFinal: ub.finalBalance, lowerFinal: lb.finalBalance, upperStatus: ub.status, lowerStatus: lb.status };
    });
  }, [scenarios, upperCrowding, lowerCrowding, settings]);

  const handleCreateScenario = () => {
    if (!patientId) return;
    const now = new Date().toISOString();
    const name = newScenarioName.trim() || `Scenario ${String.fromCharCode(65 + scenarios.length)}`;
    const scenario: TreatmentScenario = {
      id: crypto.randomUUID(),
      patientId,
      name,
      description: newScenarioDesc.trim() || undefined,
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
    setNewScenarioDesc('');
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
    handleUpdateScenario({ ...activeScenario, mechanics: [...activeScenario.mechanics, newMechanic] });
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
    handleUpdateScenario({ ...activeScenario, mechanics: activeScenario.mechanics.filter((m) => m.id !== mechanicId) });
  };

  const handleMoveMechanic = (mechanicId: string, direction: 'up' | 'down') => {
    if (!activeScenario) return;
    const idx = activeScenario.mechanics.findIndex((m) => m.id === mechanicId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= activeScenario.mechanics.length) return;
    const mechanics = [...activeScenario.mechanics];
    [mechanics[idx], mechanics[newIdx]] = [mechanics[newIdx], mechanics[idx]];
    handleUpdateScenario({ ...activeScenario, mechanics });
  };

  if (!patient) return <PatientNotFound />;

  const statusText = (s: string) => s === 'balanced' ? 'text-emerald-600' : s === 'minor' ? 'text-amber-600' : 'text-rose-600';

  return (
    <div>
      <PatientHeader patient={patient} />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Treatment Scenarios</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/patient/${patientId}/comparison`)}>
            Compare Scenarios →
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
            description="Create a treatment scenario to calculate how planned mechanics affect available arch space."
            action={<Button onClick={() => setShowNewScenario(true)}>Create scenario</Button>}
          />
        </Card>
      ) : (
        <div className="flex gap-4">
          {/* LEFT: Scenario list */}
          <div className="w-56 flex-shrink-0 space-y-2">
            {scenarioResults.map(({ scenario, upperFinal, lowerFinal, upperStatus, lowerStatus }) => (
              <div
                key={scenario.id}
                onClick={() => setActiveScenarioId(scenario.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  sId(scenario.id, activeScenarioId)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm text-slate-900 truncate flex-1">{scenario.name}</h3>
                  {scenario.isPreferred && <span className="text-amber-500 text-xs" title="Preferred by clinician">★</span>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{scenario.mechanics.length} mechanic{scenario.mechanics.length !== 1 ? 's' : ''}</p>
                <div className="mt-2 space-y-0.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Upper:</span>
                    <span className={`font-medium ${statusText(upperStatus)}`}>{upperFinal > 0 ? '+' : ''}{upperFinal.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lower:</span>
                    <span className={`font-medium ${statusText(lowerStatus)}`}>{lowerFinal > 0 ? '+' : ''}{lowerFinal.toFixed(1)} mm</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={(e) => { e.stopPropagation(); setShowDuplicate(scenario.id); setDupName(`${scenario.name} — copy`); }} className="text-xs text-slate-400 hover:text-primary-600">Dup</button>
                  <button onClick={(e) => { e.stopPropagation(); handleTogglePreferred(scenario); }} className="text-xs text-slate-400 hover:text-amber-600">{scenario.isPreferred ? 'Unpref' : 'Prefer'}</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteScenario(scenario.id, scenario.name); }} className="text-xs text-slate-400 hover:text-rose-600">Del</button>
                </div>
              </div>
            ))}
          </div>

          {/* CENTER + RIGHT: Active scenario workspace */}
          {activeScenario && activeResult ? (
            <div className="flex-1 flex gap-4 min-w-0">
              {/* CENTER: Mechanics */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Scenario name + description */}
                <div className="bg-white border border-slate-200 rounded-xl px-5 py-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={activeScenario.name}
                      onChange={(e) => handleUpdateScenario({ ...activeScenario, name: e.target.value })}
                      className="text-lg font-semibold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 flex-1 min-w-0"
                    />
                    {activeScenario.isPreferred && (
                      <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full font-medium">★ Preferred by clinician</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={activeScenario.description || ''}
                    onChange={(e) => handleUpdateScenario({ ...activeScenario, description: e.target.value })}
                    placeholder="Add description..."
                    className="text-sm text-slate-500 bg-transparent border-none focus:outline-none focus:ring-0 w-full mt-1"
                  />
                </div>

                {/* Initial condition */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Upper Arch Initial</div>
                    <div className={`text-xl font-bold ${upperCrowding < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {upperCrowding > 0 ? '+' : ''}{upperCrowding.toFixed(1)} mm
                    </div>
                    <div className="text-xs text-slate-400">{upperCrowding < 0 ? 'Crowding' : 'Spacing'}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Lower Arch Initial</div>
                    <div className={`text-xl font-bold ${lowerCrowding < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {lowerCrowding > 0 ? '+' : ''}{lowerCrowding.toFixed(1)} mm
                    </div>
                    <div className="text-xs text-slate-400">{lowerCrowding < 0 ? 'Crowding' : 'Spacing'}</div>
                  </div>
                </div>

                {/* Mechanics */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-700">Mechanics</h3>
                  <Button size="sm" onClick={() => setShowAddMechanic(true)}>+ Add mechanic</Button>
                </div>

                {activeScenario.mechanics.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
                    <p className="text-sm text-slate-400 mb-3">No mechanics added yet.</p>
                    <Button size="sm" onClick={() => setShowAddMechanic(true)}>+ Add mechanic</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeScenario.mechanics.map((m, idx) => (
                      <MechanicCard
                        key={m.id}
                        mechanic={m}
                        assumptions={activeScenario.assumptions}
                        toothMeasurements={diag?.toothMeasurements || []}
                        onUpdate={(params) => handleUpdateMechanic(m.id, params)}
                        onDelete={() => handleDeleteMechanic(m.id)}
                        onMoveUp={() => handleMoveMechanic(m.id, 'up')}
                        onMoveDown={() => handleMoveMechanic(m.id, 'down')}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < activeScenario.mechanics.length - 1}
                      />
                    ))}
                  </div>
                )}

                {/* Assumptions panel */}
                <Card title="Planning Assumptions">
                  <div className="px-5 py-4 grid grid-cols-2 gap-3 text-sm">
                    <AssumptionRow label="Expansion coefficient" value={activeScenario.assumptions.expansionCoefficient} unit="mm/mm"
                      onChange={(v) => handleUpdateScenario({ ...activeScenario, assumptions: { ...activeScenario.assumptions, expansionCoefficient: v } })} />
                    <AssumptionRow label="Incisor advancement coefficient" value={activeScenario.assumptions.incisorAdvancementCoefficient} unit="mm/mm"
                      onChange={(v) => handleUpdateScenario({ ...activeScenario, assumptions: { ...activeScenario.assumptions, incisorAdvancementCoefficient: v } })} />
                    <AssumptionRow label="Incisor retraction coefficient" value={activeScenario.assumptions.incisorRetractionCoefficient} unit="mm/mm"
                      onChange={(v) => handleUpdateScenario({ ...activeScenario, assumptions: { ...activeScenario.assumptions, incisorRetractionCoefficient: v } })} />
                    <AssumptionRow label="IPR warning threshold" value={activeScenario.assumptions.iprWarningThreshold} unit="mm/contact"
                      onChange={(v) => handleUpdateScenario({ ...activeScenario, assumptions: { ...activeScenario.assumptions, iprWarningThreshold: v } })} />
                    <AssumptionRow label="Balanced tolerance" value={activeScenario.assumptions.balancedTolerance} unit="±mm"
                      onChange={(v) => handleUpdateScenario({ ...activeScenario, assumptions: { ...activeScenario.assumptions, balancedTolerance: v } })} />
                  </div>
                  <div className="px-5 pb-3 text-xs text-slate-400">
                    These assumptions belong to this scenario snapshot. Changing global settings later will not modify existing scenarios.
                  </div>
                </Card>

                {/* Clinical notes */}
                <Card title="Clinical Notes">
                  <div className="px-5 py-4">
                    <textarea
                      value={activeScenario.clinicalNotes || ''}
                      onChange={(e) => handleUpdateScenario({ ...activeScenario, clinicalNotes: e.target.value })}
                      placeholder="Biomechanics, anchorage, periodontal considerations, profile, TMJ, patient preference..."
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 resize-y"
                    />
                  </div>
                </Card>
              </div>

              {/* RIGHT: Sticky result panel */}
              <div className="w-80 flex-shrink-0">
                <div className="sticky top-4 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <h3 className="font-semibold text-slate-900 mb-4 text-center">SPACE BALANCE</h3>

                    {/* Upper */}
                    <div className="mb-4">
                      <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Upper Arch</div>
                      <BalanceChain result={activeResult.upperBalance} />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 my-4" />

                    {/* Lower */}
                    <div>
                      <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Lower Arch</div>
                      <BalanceChain result={activeResult.lowerBalance} />
                    </div>
                  </div>

                  {/* Warnings */}
                  {activeResult.warnings.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <h3 className="font-semibold text-slate-700 text-sm mb-3">Warnings</h3>
                      <div className="space-y-2">
                        {activeResult.warnings.map((w) => (
                          <div key={w.id} className={`p-2.5 rounded-lg border text-xs ${WARNING_STYLES[w.level]}`}>
                            <div className="font-medium mb-0.5">{WARNING_LABELS[w.level]}</div>
                            <div>{w.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 text-center py-16 text-slate-400">Select a scenario from the left.</div>
          )}
        </div>
      )}

      {/* New Scenario Modal */}
      <Modal
        open={showNewScenario}
        onClose={() => setShowNewScenario(false)}
        title="Create Treatment Scenario"
        footer={<><Button variant="secondary" onClick={() => setShowNewScenario(false)}>Cancel</Button><Button onClick={handleCreateScenario}>Create</Button></>}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Scenario name</label>
            <input type="text" value={newScenarioName} onChange={(e) => setNewScenarioName(e.target.value)}
              placeholder="e.g. Non-extraction, Extraction 14/24..." autoFocus
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Description (optional)</label>
            <input type="text" value={newScenarioDesc} onChange={(e) => setNewScenarioDesc(e.target.value)}
              placeholder="Brief description of the approach"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
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
          <input type="text" value={dupName} onChange={(e) => setDupName(e.target.value)} autoFocus
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
          <p className="text-xs text-slate-400 mt-2">All mechanics, assumptions, and notes will be copied. The duplicate becomes independent.</p>
        </div>
      </Modal>

      {/* Add Mechanic Modal */}
      <Modal open={showAddMechanic} onClose={() => setShowAddMechanic(false)} title="Add Treatment Mechanic">
        <div className="space-y-2">
          {MECHANIC_TYPES.map((mt) => (
            <div key={mt.type} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
              <div>
                <div className="font-medium text-slate-800 text-sm">{mt.label}</div>
                <div className="text-xs text-slate-400">{mt.description}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => handleAddMechanic(mt.type, 'upper')}>Upper</Button>
                <Button size="sm" variant="secondary" onClick={() => handleAddMechanic(mt.type, 'lower')}>Lower</Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function sId(id: string, active: string | null): boolean {
  return id === active;
}

// ── Mechanic Card Component ────────────────────────────────────────────────

function MechanicCard({
  mechanic, assumptions, toothMeasurements, onUpdate, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
}: {
  mechanic: TreatmentMechanic;
  assumptions: CalculationAssumptions;
  toothMeasurements: ToothMeasurement[];
  onUpdate: (params: Partial<TreatmentMechanic['parameters']>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [showCalc, setShowCalc] = useState(false);
  const p = mechanic.parameters;
  const archLabel = mechanic.arch === 'upper' ? 'Upper' : 'Lower';
  const typeLabel = MECHANIC_TYPES.find((mt) => mt.type === mechanic.type)?.label || mechanic.type;

  // Build calculation explanation
  let calcFormula = '';
  let calcInputs = '';
  let calcResult = '';

  switch (mechanic.type) {
    case 'IPR':
      calcFormula = 'IPR per contact × number of contacts';
      calcInputs = `${p.iprPerContact || 0} mm × ${p.numberOfContacts || 0} contacts`;
      calcResult = `${mechanic.spaceEffect.toFixed(1)} mm`;
      break;
    case 'EXPANSION':
      if (p.expansionMode === 'manual') {
        calcFormula = 'Manual space gain entry';
        calcInputs = `${p.manualSpaceGain || 0} mm`;
      } else {
        calcFormula = 'Expansion amount × coefficient';
        calcInputs = `${p.expansionAmount || 0} mm × ${p.expansionCoefficient ?? assumptions.expansionCoefficient}`;
      }
      calcResult = `${mechanic.spaceEffect.toFixed(1)} mm`;
      break;
    case 'DISTALIZATION':
      calcFormula = 'Right + Left (or expected usable space)';
      calcInputs = `${p.rightDistalization || 0} + ${p.leftDistalization || 0} mm`;
      calcResult = `${mechanic.spaceEffect.toFixed(1)} mm`;
      break;
    case 'EXTRACTION': {
      const totalExtraction = calculateExtractionTotalSpace(Object.values(p.toothWidths || {}));
      const allocTotal = getExtractionAllocationTotal(p.extractionAllocation);
      const unallocated = getExtractionUnallocated(totalExtraction, p.extractionAllocation);
      calcFormula = 'Alignment portion of extraction allocation';
      calcInputs = `Total: ${totalExtraction.toFixed(1)} mm, Allocated: ${allocTotal.toFixed(1)} mm, Unallocated: ${unallocated.toFixed(1)} mm`;
      calcResult = `${mechanic.spaceEffect.toFixed(1)} mm for alignment`;
      break;
    }
    case 'INCISOR_MOVEMENT':
      calcFormula = 'Incisor movement × coefficient';
      calcInputs = `${p.incisorMovement || 0} mm × ${p.incisorCoefficient ?? (p.incisorMovement && p.incisorMovement > 0 ? assumptions.incisorAdvancementCoefficient : assumptions.incisorRetractionCoefficient)}`;
      calcResult = `${mechanic.spaceEffect.toFixed(1)} mm`;
      break;
    case 'CUSTOM':
      calcFormula = 'Manual entry';
      calcInputs = `${p.customSpaceEffect || 0} mm`;
      calcResult = `${mechanic.spaceEffect.toFixed(1)} mm`;
      break;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 text-sm">{typeLabel}</span>
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">{archLabel} arch</span>
          {p.customName && <span className="text-xs text-slate-500">— {p.customName}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-base font-bold ${mechanic.spaceEffect >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {mechanic.spaceEffect > 0 ? '+' : ''}{mechanic.spaceEffect.toFixed(1)} mm
          </span>
          <div className="flex flex-col">
            <button onClick={onMoveUp} disabled={!canMoveUp} className="text-slate-300 hover:text-slate-600 disabled:opacity-30 text-xs leading-none">▲</button>
            <button onClick={onMoveDown} disabled={!canMoveDown} className="text-slate-300 hover:text-slate-600 disabled:opacity-30 text-xs leading-none">▼</button>
          </div>
          <button onClick={onDelete} className="text-slate-300 hover:text-rose-600">
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
              <select value={p.expansionMode || 'calculated'} onChange={(e) => onUpdate({ expansionMode: e.target.value as 'manual' | 'calculated' })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400">
                <option value="calculated">Calculated</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            {p.expansionMode === 'manual' ? (
              <NumberInput label="Estimated space gain" value={p.manualSpaceGain} onChange={(v) => onUpdate({ manualSpaceGain: v })} unit="mm" />
            ) : (
              <>
                <NumberInput label="Expansion amount" value={p.expansionAmount} onChange={(v) => onUpdate({ expansionAmount: v })} unit="mm" />
                <NumberInput label="Coefficient (assumption)" value={p.expansionCoefficient ?? assumptions.expansionCoefficient} onChange={(v) => onUpdate({ expansionCoefficient: v })} unit="mm/mm" />
              </>
            )}
          </>
        )}
        {mechanic.type === 'DISTALIZATION' && (
          <>
            <NumberInput label="Right distalization" value={p.rightDistalization} onChange={(v) => onUpdate({ rightDistalization: v })} unit="mm" />
            <NumberInput label="Left distalization" value={p.leftDistalization} onChange={(v) => onUpdate({ leftDistalization: v })} unit="mm" />
            <NumberInput label="Expected usable space" value={p.expectedUsableSpace} onChange={(v) => onUpdate({ expectedUsableSpace: v })} unit="mm" />
          </>
        )}
        {mechanic.type === 'EXTRACTION' && (
          <>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Extracted teeth (FDI, comma-separated)</label>
              <input type="text" value={(p.extractedTeeth || []).join(', ')}
                onChange={(e) => {
                  const teeth = e.target.value.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n) && n > 0);
                  // Auto-populate widths from tooth measurements
                  const widths: Record<number, number> = {};
                  for (const fdi of teeth) {
                    const measured = toothMeasurements.find((t) => t.fdiNumber === fdi);
                    if (measured) widths[fdi] = measured.mesiodistalWidth;
                    else if (p.toothWidths?.[fdi]) widths[fdi] = p.toothWidths[fdi];
                  }
                  onUpdate({ extractedTeeth: teeth, toothWidths: widths });
                }}
                placeholder="e.g. 14, 24"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
          </>
        )}
        {mechanic.type === 'INCISOR_MOVEMENT' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Type</label>
              <select
                value={p.incisorMovement && p.incisorMovement < 0 ? 'retraction' : 'advancement'}
                onChange={(e) => {
                  const isAdv = e.target.value === 'advancement';
                  const abs = Math.abs(p.incisorMovement || 0);
                  onUpdate({ incisorMovement: isAdv ? abs : -abs });
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value="advancement">Advancement</option>
                <option value="retraction">Retraction</option>
              </select>
            </div>
            <NumberInput label="Movement amount" value={Math.abs(p.incisorMovement || 0)} onChange={(v) => {
              const isAdv = !p.incisorMovement || p.incisorMovement >= 0;
              onUpdate({ incisorMovement: isAdv ? (v || 0) : -(v || 0) });
            }} unit="mm" />
            <NumberInput label="Coefficient (assumption)" value={p.incisorCoefficient ?? (p.incisorMovement && p.incisorMovement > 0 ? assumptions.incisorAdvancementCoefficient : assumptions.incisorRetractionCoefficient)} onChange={(v) => onUpdate({ incisorCoefficient: v })} unit="mm/mm" />
          </>
        )}
        {mechanic.type === 'CUSTOM' && (
          <>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
              <input type="text" value={p.customName || ''} onChange={(e) => onUpdate({ customName: e.target.value })}
                placeholder="e.g. Derotation of posterior teeth"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
            <NumberInput label="Space effect" value={p.customSpaceEffect} onChange={(v) => onUpdate({ customSpaceEffect: v })} unit="mm" />
          </>
        )}
      </div>

      {/* Extraction tooth widths + allocation */}
      {mechanic.type === 'EXTRACTION' && (p.extractedTeeth || []).length > 0 && (
        <ExtractionAllocationEditor mechanic={mechanic} onUpdate={onUpdate} />
      )}

      {/* How calculated */}
      <div className="mt-3 pt-2 border-t border-slate-100">
        <button onClick={() => setShowCalc(!showCalc)} className="text-xs text-slate-400 hover:text-primary-600">
          {showCalc ? '− Hide' : '+ How calculated'}
        </button>
        {showCalc && (
          <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            <div><span className="text-slate-400">Formula:</span> {calcFormula}</div>
            <div><span className="text-slate-400">Inputs:</span> {calcInputs}</div>
            <div><span className="text-slate-400">Result:</span> <span className="font-medium text-slate-700">{calcResult}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Extraction Allocation Editor ───────────────────────────────────────────

function ExtractionAllocationEditor({
  mechanic, onUpdate,
}: {
  mechanic: TreatmentMechanic;
  onUpdate: (params: Partial<TreatmentMechanic['parameters']>) => void;
}) {
  const p = mechanic.parameters;
  const widths = p.toothWidths || {};
  const totalExtraction = calculateExtractionTotalSpace(Object.values(widths));
  const allocation = p.extractionAllocation || {};
  const allocTotal = getExtractionAllocationTotal(p.extractionAllocation);
  const unallocated = getExtractionUnallocated(totalExtraction, p.extractionAllocation);

  const updateAllocation = (field: keyof ExtractionAllocation, value: number | undefined) => {
    const newAlloc = { ...allocation, [field]: value };
    onUpdate({ extractionAllocation: newAlloc });
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
      {/* Tooth widths */}
      <div>
        <div className="text-xs text-slate-400 mb-2">Mesiodistal widths (auto-filled from diagnostics, editable):</div>
        <div className="grid grid-cols-6 gap-2">
          {(p.extractedTeeth || []).map((fdi) => (
            <NumberInput key={fdi} label={`#${fdi}`} value={widths[fdi]}
              onChange={(v) => {
                const newWidths = { ...widths };
                if (v === undefined) delete newWidths[fdi];
                else newWidths[fdi] = v;
                onUpdate({ toothWidths: newWidths });
              }}
              unit="mm" />
          ))}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Total extraction space: <span className="font-medium text-slate-700">{totalExtraction.toFixed(1)} mm</span>
        </div>
      </div>

      {/* Allocation */}
      <div>
        <div className="text-xs text-slate-400 mb-2 font-medium">Space allocation:</div>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="Alignment" value={allocation.alignment} onChange={(v) => updateAllocation('alignment', v)} unit="mm" />
          <NumberInput label="Incisor retraction" value={allocation.incisorRetraction} onChange={(v) => updateAllocation('incisorRetraction', v)} unit="mm" />
          <NumberInput label="Anchorage loss" value={allocation.anchorageLoss} onChange={(v) => updateAllocation('anchorageLoss', v)} unit="mm" />
          <NumberInput label="Molar movement" value={allocation.molarMovement} onChange={(v) => updateAllocation('molarMovement', v)} unit="mm" />
          <NumberInput label="Other" value={allocation.other} onChange={(v) => updateAllocation('other', v)} unit="mm" />
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-slate-500">
            Total allocated: <span className="font-medium text-slate-700">{allocTotal.toFixed(1)} mm</span>
          </span>
          <span className={unallocated > 0.01 ? 'text-amber-600 font-medium' : unallocated < -0.01 ? 'text-rose-600 font-medium' : 'text-emerald-600 font-medium'}>
            Unallocated: {unallocated > 0 ? '+' : ''}{unallocated.toFixed(1)} mm
          </span>
        </div>
        {unallocated > 0.01 && (
          <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded p-2">
            {unallocated.toFixed(1)} mm of extraction space remains unallocated.
          </div>
        )}
        {unallocated < -0.01 && (
          <div className="mt-2 text-xs text-rose-600 bg-rose-50 rounded p-2">
            Planned allocation exceeds available extraction space by {Math.abs(unallocated).toFixed(1)} mm. Review plan assumptions.
          </div>
        )}
      </div>
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
      </div>
    </div>
  );
}