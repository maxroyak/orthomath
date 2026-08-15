import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { store } from '../persistence/store';

export function LandingPage() {
  const navigate = useNavigate();

  const handleCreatePatient = () => {
    navigate('/dashboard');
  };

  const handleOpenDemo = () => {
    const patients = store.getPatients();
    if (patients.length > 0) {
      navigate(`/patient/${patients[0].id}/diagnostics`);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 text-center">
      <div className="mb-6">
        <h1 className="text-5xl font-bold text-slate-900 tracking-tight">
          OrthoMath
        </h1>
        <p className="text-lg text-slate-400 mt-1">Orthodontic Treatment Sandbox</p>
      </div>

      <h2 className="text-3xl font-semibold text-slate-800 mb-4">
        Orthodontic treatment planning, calculated.
      </h2>
      <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed">
        Compare treatment strategies, calculate space balance, and understand the
        assumptions behind your plan.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
        <Button size="md" onClick={handleCreatePatient} className="px-8 py-3 text-base">
          Create patient
        </Button>
        <Button variant="secondary" size="md" onClick={handleOpenDemo} className="px-8 py-3 text-base">
          Open demo case
        </Button>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Space Analysis</h3>
          <p className="text-sm text-slate-500">Enter diagnostic measurements once and get instant crowding/spacing calculations for both arches.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Scenario Comparison</h3>
          <p className="text-sm text-slate-500">Create multiple treatment plans and compare space balance side by side. Duplicate and modify in seconds.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Full Transparency</h3>
          <p className="text-sm text-slate-500">Every calculation shows its formula, inputs, and assumptions. No black boxes. No hidden coefficients.</p>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-16 max-w-2xl mx-auto leading-relaxed">
        OrthoMath is a clinical calculation and treatment-planning support tool intended for
        qualified dental professionals. It does not provide a diagnosis or prescribe treatment.
        All calculations must be interpreted and verified by the treating clinician.
      </p>
    </div>
  );
}