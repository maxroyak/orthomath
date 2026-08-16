import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Patient, DiagnosticRecord, ArchMeasurement, ToothMeasurement, CephalometricValues } from '../domain/types';
import { store } from '../persistence/store';
import { PatientHeader } from '../components/layout/PatientHeader';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import { PatientNotFound } from '../components/ui/PatientNotFound';
import { calculateBolton } from '../domain/calculations/bolton';
import type { BoltonStatus } from '../domain/calculations/bolton';

const UPPER_FDI = [11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27];
const LOWER_FDI = [41, 42, 43, 44, 45, 46, 47, 31, 32, 33, 34, 35, 36, 37];

export function DiagnosticsPage() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState<Patient | undefined>();
  const [diag, setDiag] = useState<DiagnosticRecord | undefined>();
  const [showDetailed, setShowDetailed] = useState(false);
  const [showCeph, setShowCeph] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    setPatient(store.getPatient(patientId));
    const d = store.getDiagnostic(patientId);
    if (d) {
      setDiag(d);
      setShowDetailed(d.toothMeasurements.length > 0);
      setShowCeph(Object.keys(d.cephalometric || {}).length > 0);
    }
  }, [patientId]);

  // Auto-save (debounced to avoid write loops)
  useEffect(() => {
    if (diag && patientId) {
      const timer = setTimeout(() => {
        store.saveDiagnostic(diag);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [diag, patientId]);

  const ensureDiag = (): DiagnosticRecord => {
    if (diag) return diag;
    const now = new Date().toISOString();
    const newDiag: DiagnosticRecord = {
      id: crypto.randomUUID(),
      patientId: patientId!,
      archMeasurements: [
        { arch: 'upper' },
        { arch: 'lower' },
      ],
      toothMeasurements: [],
      cephalometric: {},
      includeBolton: false,
      createdAt: now,
      updatedAt: now,
    };
    setDiag(newDiag);
    return newDiag;
  };

  const updateArch = (arch: 'upper' | 'lower', field: keyof ArchMeasurement, value: number | undefined) => {
    const d = ensureDiag();
    setDiag({
      ...d,
      archMeasurements: d.archMeasurements.map((a) =>
        a.arch === arch ? { ...a, [field]: value } : a
      ),
    });
  };

  const updateTooth = (fdi: number, width: number | undefined) => {
    const d = ensureDiag();
    const existing = d.toothMeasurements.find((t) => t.fdiNumber === fdi);
    let teeth: ToothMeasurement[];
    if (existing) {
      teeth = width === undefined
        ? d.toothMeasurements.filter((t) => t.fdiNumber !== fdi)
        : d.toothMeasurements.map((t) => t.fdiNumber === fdi ? { ...t, mesiodistalWidth: width } : t);
    } else if (width !== undefined) {
      teeth = [...d.toothMeasurements, {
        id: crypto.randomUUID(),
        fdiNumber: fdi,
        arch: fdi >= 10 && fdi <= 27 ? 'upper' : 'lower',
        mesiodistalWidth: width,
      }];
    } else {
      teeth = d.toothMeasurements;
    }
    setDiag({ ...d, toothMeasurements: teeth });
  };

  const updateCeph = (field: keyof CephalometricValues, value: string) => {
    const d = ensureDiag();
    const numValue = value === '' ? undefined : parseFloat(value.replace(',', '.'));
    setDiag({
      ...d,
      cephalometric: { ...d.cephalometric, [field]: isNaN(numValue as number) ? undefined : numValue },
    });
  };

  const updateCephStr = (field: keyof CephalometricValues, value: string) => {
    const d = ensureDiag();
    setDiag({
      ...d,
      cephalometric: { ...d.cephalometric, [field]: value || undefined },
    });
  };

  const boltonResult = useMemo(() => {
    if (!diag || !diag.includeBolton) return null;
    const s = store.getSettings();
    return calculateBolton(diag.toothMeasurements, {
      boltonDiscrepancyTolerance: s.boltonDiscrepancyTolerance,
      boltonRelevantThreshold: s.boltonRelevantThreshold,
    });
  }, [diag]);

  if (!patient) return <PatientNotFound />;

  const upperArch = diag?.archMeasurements.find((a) => a.arch === 'upper');
  const lowerArch = diag?.archMeasurements.find((a) => a.arch === 'lower');

  const upperToothSum = diag?.toothMeasurements
    .filter((t) => t.arch === 'upper')
    .reduce((s, t) => s + t.mesiodistalWidth, 0) || 0;
  const lowerToothSum = diag?.toothMeasurements
    .filter((t) => t.arch === 'lower')
    .reduce((s, t) => s + t.mesiodistalWidth, 0) || 0;

  return (
    <div>
      <PatientHeader patient={patient} />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Diagnostic Data</h2>
        <div className="flex gap-2">
          <Link to={`/patient/${patientId}/scenarios`} className="inline-flex items-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 text-sm">
            Next: Treatment Planning →
          </Link>
        </div>
      </div>

      {/* Patient profile */}
      <Card title="Patient Profile" className="mb-6">
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Sex</label>
            <select
              value={patient.sex}
              onChange={(e) => {
                const updated = { ...patient, sex: e.target.value as any };
                store.savePatient(updated);
                setPatient(updated);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="unspecified">Unspecified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Dentition stage</label>
            <select
              value={patient.dentitionStage}
              onChange={(e) => {
                const updated = { ...patient, dentitionStage: e.target.value as any };
                store.savePatient(updated);
                setPatient(updated);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="permanent">Permanent dentition</option>
              <option value="mixed">Mixed dentition</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Age</label>
            <input
              type="text"
              inputMode="numeric"
              value={patient.age || ''}
              onChange={(e) => {
                const updated = { ...patient, age: parseInt(e.target.value) || undefined };
                store.savePatient(updated);
                setPatient(updated);
              }}
              placeholder="years"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Notes</label>
            <input
              type="text"
              value={patient.notes || ''}
              onChange={(e) => {
                const updated = { ...patient, notes: e.target.value };
                store.savePatient(updated);
                setPatient(updated);
              }}
              placeholder="Optional notes"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>
      </Card>

      {/* Arch measurements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Upper Arch">
          <div className="px-6 py-4 space-y-4">
            <NumberInput
              label="Crowding / Spacing (mm)"
              value={upperArch?.crowdingSpacing}
              onChange={(v) => updateArch('upper', 'crowdingSpacing', v)}
              placeholder="e.g. -6.4 for crowding"
            />
            <p className="text-xs text-slate-400">
              Negative = crowding (space deficiency) · Positive = spacing (excess space)
            </p>
            {showDetailed && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <NumberInput label="Available arch perimeter (mm)" value={upperArch?.archPerimeter} onChange={(v) => updateArch('upper', 'archPerimeter', v)} placeholder="Optional" />
                <NumberInput label="Required tooth material (mm)" value={upperArch?.toothMaterial} onChange={(v) => updateArch('upper', 'toothMaterial', v)} placeholder="Optional" />
                {upperArch?.archPerimeter !== undefined && upperArch?.toothMaterial !== undefined && (
                  <div className="text-sm bg-slate-50 rounded-lg p-3">
                    Calculated crowding/spacing:{' '}
                    <span className="font-medium">
                      {(upperArch.archPerimeter - upperArch.toothMaterial).toFixed(1)} mm
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card title="Lower Arch">
          <div className="px-6 py-4 space-y-4">
            <NumberInput
              label="Crowding / Spacing (mm)"
              value={lowerArch?.crowdingSpacing}
              onChange={(v) => updateArch('lower', 'crowdingSpacing', v)}
              placeholder="e.g. -4.2 for crowding"
            />
            <p className="text-xs text-slate-400">
              Negative = crowding (space deficiency) · Positive = spacing (excess space)
            </p>
            {showDetailed && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <NumberInput label="Available arch perimeter (mm)" value={lowerArch?.archPerimeter} onChange={(v) => updateArch('lower', 'archPerimeter', v)} placeholder="Optional" />
                <NumberInput label="Required tooth material (mm)" value={lowerArch?.toothMaterial} onChange={(v) => updateArch('lower', 'toothMaterial', v)} placeholder="Optional" />
                {lowerArch?.archPerimeter !== undefined && lowerArch?.toothMaterial !== undefined && (
                  <div className="text-sm bg-slate-50 rounded-lg p-3">
                    Calculated crowding/spacing:{' '}
                    <span className="font-medium">
                      {(lowerArch.archPerimeter - lowerArch.toothMaterial).toFixed(1)} mm
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Toggle detailed mode */}
      <div className="mb-6">
        <button
          onClick={() => setShowDetailed(!showDetailed)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {showDetailed ? '− Hide detailed tooth measurements' : '+ Show detailed tooth measurements'}
        </button>
      </div>

      {/* Detailed tooth measurements */}
      {showDetailed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card title={`Upper Arch Teeth — Total: ${upperToothSum.toFixed(1)} mm`}>
            <div className="px-6 py-4 grid grid-cols-4 gap-3">
              {UPPER_FDI.map((fdi) => {
                const tooth = diag?.toothMeasurements.find((t) => t.fdiNumber === fdi);
                return (
                  <NumberInput
                    key={fdi}
                    label={`#${fdi}`}
                    value={tooth?.mesiodistalWidth}
                    onChange={(v) => updateTooth(fdi, v)}
                    placeholder="mm"
                    step={0.1}
                  />
                );
              })}
            </div>
          </Card>
          <Card title={`Lower Arch Teeth — Total: ${lowerToothSum.toFixed(1)} mm`}>
            <div className="px-6 py-4 grid grid-cols-4 gap-3">
              {LOWER_FDI.map((fdi) => {
                const tooth = diag?.toothMeasurements.find((t) => t.fdiNumber === fdi);
                return (
                  <NumberInput
                    key={fdi}
                    label={`#${fdi}`}
                    value={tooth?.mesiodistalWidth}
                    onChange={(v) => updateTooth(fdi, v)}
                    placeholder="mm"
                    step={0.1}
                  />
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Bolton Analysis */}
      <Card title="Bolton Analysis" className="mb-6" action={
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={diag?.includeBolton || false}
            onChange={(e) => {
              const d = ensureDiag();
              setDiag({ ...d, includeBolton: e.target.checked });
            }}
            className="rounded border-slate-300"
          />
          Include in case
        </label>
      }>
        <div className="px-6 py-4">
          {!diag?.includeBolton ? (
            <p className="text-sm text-slate-500">
              Enable Bolton analysis to calculate anterior and overall tooth-size ratios.
              Requires detailed tooth measurements.
            </p>
          ) : diag.toothMeasurements.length === 0 ? (
            <p className="text-sm text-amber-600">
              Bolton analysis cannot be calculated because no tooth measurements have been entered.
              Enter tooth measurements in the detailed mode above.
            </p>
          ) : boltonResult ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">{boltonResult.message}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {boltonResult.anterior && (
                  <BoltonRatioCard title="Bolton Anterior" result={boltonResult.anterior} formula="Σ lower anterior 6 / Σ upper anterior 6 × 100" />
                )}
                {boltonResult.overall && (
                  <BoltonRatioCard title="Bolton Overall" result={boltonResult.overall} formula="Σ lower 12 / Σ upper 12 × 100" />
                )}
              </div>
              <p className="text-xs text-slate-400 italic">
                OrthoMath does not automatically prescribe IPR, restoration, extraction, or enamel reduction.
                All discrepancy interpretations require clinical review by the treating clinician.
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Optional cephalometric values */}
      <div className="mb-6">
        <button
          onClick={() => setShowCeph(!showCeph)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {showCeph ? '− Hide optional diagnostic fields' : '+ Show optional diagnostic fields (cephalometric)'}
        </button>
      </div>

      {showCeph && (
        <Card title="Cephalometric & Clinical Values (stored, not yet used in calculations)" className="mb-6">
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              ['SNA', 'SNA (°)'], ['SNB', 'SNB (°)'], ['ANB', 'ANB (°)'], ['Wits', 'Wits (mm)'],
              ['FMA', 'FMA (°)'], ['SN-MP', 'SN-MP (°)'], ['IMPA', 'IMPA (°)'], ['U1-SN', 'U1-SN (°)'],
              ['overjet', 'Overjet (mm)'], ['overbite', 'Overbite (mm)'],
              ['upperMidlineDeviation', 'Upper midline (mm)'], ['lowerMidlineDeviation', 'Lower midline (mm)'],
            ] as const).map(([field, label]) => (
              <NumberInput
                key={field}
                label={label}
                value={diag?.cephalometric?.[field] as number | undefined}
                onChange={(v) => updateCeph(field, String(v ?? ''))}
                placeholder="—"
                unit={label.includes('°') ? '°' : 'mm'}
              />
            ))}
            {([
              ['molarRelationshipRight', 'Molar R'], ['molarRelationshipLeft', 'Molar L'],
              ['canineRelationshipRight', 'Canine R'], ['canineRelationshipLeft', 'Canine L'],
            ] as const).map(([field, label]) => (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
                <input
                  type="text"
                  value={(diag?.cephalometric?.[field] as string) || ''}
                  onChange={(e) => updateCephStr(field, e.target.value)}
                  placeholder="e.g. Class I"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            ))}
          </div>
          <p className="px-6 pb-4 text-xs text-slate-400">
            These values are stored with the patient record and displayed in the summary.
            They are not yet used by the calculation engine.
          </p>
        </Card>
      )}
    </div>
  );
}

// ── Bolton Ratio Card Component ─────────────────────────────────────────────

function BoltonRatioCard({ title, result, formula }: {
  title: string;
  result: import('../domain/calculations/bolton').BoltonRatioResult;
  formula: string;
}) {
  const statusStyles: Record<BoltonStatus, { bg: string; text: string; label: string }> = {
    within_tolerance: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Within configured tolerance' },
    minor_discrepancy: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Minor tooth-size discrepancy' },
    relevant_discrepancy: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Tooth-size discrepancy requires clinical review' },
  };
  const s = statusStyles[result.status];
  const dirLabel = result.discrepancyDirection === 'mandibular_excess' ? 'Mandibular excess' :
    result.discrepancyDirection === 'maxillary_excess' ? 'Maxillary excess' : 'None';

  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="flex items-center gap-1 mb-3">
        <h4 className="font-medium text-slate-700">{title}</h4>
        <InfoTooltip
          label={title}
          formula={formula}
          inputs={`Ratio: ${result.ratio}%`}
          result={`${result.ratio}%`}
        />
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-slate-400">Calculated</span><span className="font-medium text-slate-700">{result.ratio}%</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Reference</span><span className="text-slate-600">{result.reference}%</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Ratio difference</span><span className="text-slate-600">{result.difference > 0 ? '+' : ''}{result.difference}%</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Estimated discrepancy</span><span className="font-medium text-slate-700">{result.discrepancyMm} mm</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Direction</span><span className="text-slate-600">{dirLabel}</span></div>
      </div>
      <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium ${s.bg} ${s.text}`}>
        {s.label}
      </div>
    </div>
  );
}
