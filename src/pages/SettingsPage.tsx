import { useState, useEffect } from 'react';
import type { UserSettings } from '../domain/types';
import { store } from '../persistence/store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | undefined>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(store.getSettings());
  }, []);

  const update = (newSettings: UserSettings) => {
    setSettings(newSettings);
    setSaved(false);
  };

  const handleSave = () => {
    if (settings) {
      store.saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleReset = () => {
    if (confirm('Reset all data? This will delete all patients, diagnostics, scenarios, and settings. This cannot be undone.')) {
      store.resetAll();
      window.location.reload();
    }
  };

  if (!settings) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Settings</h2>
      <p className="text-sm text-slate-500 mb-8">Configure default assumptions and thresholds for calculations.</p>

      {/* Space Balance thresholds */}
      <Card title="Space Balance Thresholds" className="mb-6">
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <NumberInput
            label="Balanced discrepancy tolerance (±mm)"
            value={settings.balancedTolerance}
            onChange={(v) => update({ ...settings, balancedTolerance: v || 0, defaultAssumptions: { ...settings.defaultAssumptions, balancedTolerance: v || 0 } })}
            unit="±mm"
          />
          <NumberInput
            label="Minor discrepancy threshold (mm)"
            value={settings.minorDiscrepancyThreshold}
            onChange={(v) => update({ ...settings, minorDiscrepancyThreshold: v || 0 })}
            unit="mm"
          />
        </div>
        <div className="px-6 pb-4 text-xs text-slate-400">
          Balanced: within ±{settings.balancedTolerance} mm · Minor: {settings.balancedTolerance}-{settings.minorDiscrepancyThreshold} mm · Unresolved: beyond {settings.minorDiscrepancyThreshold} mm
        </div>
      </Card>

      {/* Bolton thresholds */}
      <Card title="Bolton Analysis Thresholds" className="mb-6">
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <NumberInput
            label="Bolton discrepancy tolerance (mm)"
            value={settings.boltonDiscrepancyTolerance}
            onChange={(v) => update({ ...settings, boltonDiscrepancyTolerance: v || 0 })}
            unit="mm"
          />
          <NumberInput
            label="Bolton relevant discrepancy threshold (mm)"
            value={settings.boltonRelevantThreshold}
            onChange={(v) => update({ ...settings, boltonRelevantThreshold: v || 0 })}
            unit="mm"
          />
        </div>
        <div className="px-6 pb-4 text-xs text-slate-400">
          Within tolerance: ≤{settings.boltonDiscrepancyTolerance} mm · Minor: {settings.boltonDiscrepancyTolerance}-{settings.boltonRelevantThreshold} mm · Requires review: beyond {settings.boltonRelevantThreshold} mm.
          These are configurable assumptions, not universal clinical standards.
        </div>
      </Card>

      {/* Default assumptions */}
      <Card title="Default Planning Assumptions" className="mb-6">
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <NumberInput
            label="Expansion space coefficient"
            value={settings.defaultAssumptions.expansionCoefficient}
            onChange={(v) => update({ ...settings, defaultAssumptions: { ...settings.defaultAssumptions, expansionCoefficient: v || 0 } })}
            unit="mm/mm"
          />
          <NumberInput
            label="Incisor advancement coefficient"
            value={settings.defaultAssumptions.incisorAdvancementCoefficient}
            onChange={(v) => update({ ...settings, defaultAssumptions: { ...settings.defaultAssumptions, incisorAdvancementCoefficient: v || 0 } })}
            unit="mm/mm"
          />
          <NumberInput
            label="Incisor retraction coefficient"
            value={settings.defaultAssumptions.incisorRetractionCoefficient}
            onChange={(v) => update({ ...settings, defaultAssumptions: { ...settings.defaultAssumptions, incisorRetractionCoefficient: v || 0 } })}
            unit="mm/mm"
          />
          <NumberInput
            label="Default extraction-space utilization"
            value={settings.defaultAssumptions.extractionSpaceUtilization}
            onChange={(v) => update({ ...settings, defaultAssumptions: { ...settings.defaultAssumptions, extractionSpaceUtilization: v || 0 } })}
            unit="%"
          />
          <NumberInput
            label="IPR warning threshold"
            value={settings.defaultAssumptions.iprWarningThreshold}
            onChange={(v) => update({ ...settings, defaultAssumptions: { ...settings.defaultAssumptions, iprWarningThreshold: v || 0 } })}
            unit="mm/contact"
          />
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center">
          <p className="text-xs text-slate-400">
            These values become the default assumptions for new scenarios. Each scenario retains its own assumptions at creation time.
          </p>
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-emerald-600">Saved!</span>}
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      </Card>

      <Card title="Data Management" className="mb-6">
        <div className="px-6 py-4">
          <p className="text-sm text-slate-600 mb-3">
            All data is stored locally in your browser. No data is sent to any server.
          </p>
          <Button variant="danger" size="sm" onClick={handleReset}>
            Reset all data
          </Button>
        </div>
      </Card>
    </div>
  );
}