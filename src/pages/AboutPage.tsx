import { Card } from '../components/ui/Card';

export function AboutPage() {
  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">About OrthoMath</h2>
      <p className="text-sm text-slate-500 mb-8">Orthodontic Treatment Sandbox</p>

      <Card className="mb-6">
        <div className="px-6 py-4 space-y-4 text-sm text-slate-600">
          <p>
            OrthoMath is a clinical calculation and treatment-planning support tool intended for
            qualified dental professionals. It does not provide a diagnosis or prescribe treatment.
            All calculations must be interpreted and verified by the treating clinician.
          </p>
          <p>
            The core concept: an orthodontist enters patient measurements once, creates several
            treatment scenarios, and OrthoMath automatically recalculates space balance and highlights
            whether each proposed treatment plan is mathematically feasible.
          </p>
        </div>
      </Card>

      <Card title="Key Principles" className="mb-6">
        <div className="px-6 py-4 space-y-3 text-sm text-slate-600">
          <div>
            <h4 className="font-medium text-slate-800">Transparency</h4>
            <p>Every calculated number shows its formula, inputs, and assumptions. No black-box calculations.</p>
          </div>
          <div>
            <h4 className="font-medium text-slate-800">Auditability</h4>
            <p>Every scenario retains the assumptions used when it was calculated. Results are reproducible.</p>
          </div>
          <div>
            <h4 className="font-medium text-slate-800">Clinical Safety</h4>
            <p>The application does not diagnose, rank scenarios as "best", or prescribe treatment. The clinician makes all clinical decisions.</p>
          </div>
          <div>
            <h4 className="font-medium text-slate-800">Privacy</h4>
            <p>All data is stored locally in your browser. No patient data is sent to any server. Anonymized patients are supported.</p>
          </div>
        </div>
      </Card>

      <Card title="Privacy" className="mb-6">
        <div className="px-6 py-4 space-y-2 text-sm text-slate-600">
          <p>For MVP, all data is stored locally in the browser (localStorage). No patient data leaves the device.</p>
          <p>The application supports fully anonymized patients (auto-generated IDs).</p>
          <p>No analytics that send patient data to third parties are included.</p>
        </div>
      </Card>

      <Card title="Future Roadmap">
        <div className="px-6 py-4 space-y-1 text-sm text-slate-600">
          <p>STL upload and 3D arch analysis</p>
          <p>Automatic tooth measurements</p>
          <p>Cephalometric analysis</p>
          <p>CBCT integration</p>
          <p>Aligner treatment-plan analysis</p>
          <p>Condylography and TMJ MRI data</p>
          <p>Treatment progress tracking</p>
          <p>Multi-user clinics and cloud synchronization</p>
        </div>
      </Card>
    </div>
  );
}
