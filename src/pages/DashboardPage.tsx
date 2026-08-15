import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { Patient } from '../domain/types';
import { store } from '../persistence/store';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

type PatientWithMeta = Patient & {
  scenarioCount: number;
  status: 'Draft' | 'Calculated' | 'Needs Review';
};

function getPatientStatus(patient: Patient): 'Draft' | 'Calculated' | 'Needs Review' {
  const diag = store.getDiagnostic(patient.id);
  const scenarios = store.getScenarios(patient.id);

  if (!diag || scenarios.length === 0) return 'Draft';
  if (scenarios.length > 0) {
    // Check if any scenario has unresolved discrepancies
    // For status, we just check existence of scenarios with mechanics
    const hasMechanics = scenarios.some((s) => s.mechanics.length > 0);
    return hasMechanics ? 'Calculated' : 'Needs Review';
  }
  return 'Draft';
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientWithMeta[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [anon, setAnon] = useState(false);

  const refresh = () => {
    const all = store.getPatients();
    const withMeta: PatientWithMeta[] = all.map((p) => {
      const scenarios = store.getScenarios(p.id);
      return {
        ...p,
        scenarioCount: scenarios.length,
        status: getPatientStatus(p),
      };
    });
    setPatients(withMeta);
  };

  useEffect(() => { refresh(); }, []);

  const handleCreate = () => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const name = anon
      ? `Patient #${String(patients.length + 1).padStart(3, '0')}`
      : newName.trim() || `Patient #${String(patients.length + 1).padStart(3, '0')}`;

    const patient: Patient = {
      id,
      name,
      age: newAge ? parseInt(newAge) : undefined,
      sex: 'unspecified',
      dentitionStage: 'permanent',
      createdAt: now,
      updatedAt: now,
    };

    store.savePatient(patient);
    setShowNew(false);
    setNewName('');
    setNewAge('');
    setAnon(false);
    navigate(`/patient/${id}/diagnostics`);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete patient "${name}"? This will remove all diagnostics and scenarios. This cannot be undone.`)) {
      store.deletePatient(id);
      refresh();
    }
  };

  const statusColors: Record<string, string> = {
    'Draft': 'bg-slate-100 text-slate-600',
    'Calculated': 'bg-emerald-50 text-emerald-700',
    'Needs Review': 'bg-amber-50 text-amber-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Manage patient cases and treatment plans</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Patient
        </Button>
      </div>

      {patients.length === 0 ? (
        <Card>
          <EmptyState
            title="No patient cases yet"
            description="Create your first patient case to begin entering diagnostic measurements and building treatment scenarios."
            action={<Button onClick={() => setShowNew(true)}>Create patient</Button>}
            icon={<svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p) => (
            <Card key={p.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer" >
              <div onClick={() => navigate(`/patient/${p.id}/diagnostics`)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.age ? `${p.age} years` : 'Age not set'} · {p.dentitionStage === 'mixed' ? 'Mixed dentition' : 'Permanent dentition'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[p.status]}`}>
                    {p.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-400">Scenarios</span>
                    <p className="font-medium text-slate-700">{p.scenarioCount}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Updated</span>
                    <p className="font-medium text-slate-700 text-xs">
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  Created {new Date(p.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name); }}
                  className="text-xs text-slate-400 hover:text-rose-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Patient Modal */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="New Patient"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Patient name</label>
            <input
              type="text"
              value={anon ? '' : newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={anon}
              placeholder="Enter patient name or use anonymized"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Age (years)</label>
            <input
              type="text"
              inputMode="numeric"
              value={newAge}
              onChange={(e) => setNewAge(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 17"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={anon}
              onChange={(e) => setAnon(e.target.checked)}
              className="rounded border-slate-300"
            />
            Create anonymized patient (auto-generated ID)
          </label>
        </div>
      </Modal>
    </div>
  );
}