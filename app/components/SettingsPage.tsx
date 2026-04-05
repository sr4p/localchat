import { ArrowLeft, Zap, Gauge, FileDown, RotateCcw, Code } from 'lucide-react';
import type { AppSettings } from '../hooks/useAppSettings';

export interface SettingsPageProps {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onResetDefaults: () => void;
  onGoToChat: () => void;
  totalTokenCount: number;
}

function Toggle({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onChange}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full bg-[#d1d5db] transition-colors duration-200"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5505af] ${
          enabled ? 'translate-x-5 bg-[#5505af]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function SettingsPage({
  settings,
  update,
  onResetDefaults,
  onGoToChat,
  totalTokenCount,
}: SettingsPageProps) {
  const handleBudgetToggle = () => {
    if (settings.tokenBudget != null) {
      update('tokenBudget', null);
    } else {
      update('tokenBudget', 10000);
    }
  };

  const isDestructive =
    settings.tokenBudget != null && totalTokenCount > settings.tokenBudget;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[#00000066] backdrop-blur-sm animate-fade-in"
        onClick={onGoToChat}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-[#0000001f] bg-white shadow-2xl animate-rise-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[#0000001f] px-6 py-4">
            <button
              onClick={onGoToChat}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6d6d6d] hover:bg-[#f5f5f5] hover:text-black transition-colors cursor-pointer"
              title="Close settings"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-lg font-semibold text-black">Settings</h1>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[70vh] px-6 py-6">
            <div className="space-y-6">
          {/* Generation */}
          <Section label="Generation" icon={<Zap className="h-4 w-4 text-[#5505af]" />}>
            <SettingRow>
              <span className="text-sm text-[#3d3d3d]">Max tokens</span>
              <input
                type="number"
                min={1}
                max={65536}
                value={settings.maxTokens}
                onChange={(e) => update('maxTokens', Math.max(1, Math.min(65536, Number(e.target.value))))}
                className="w-24 rounded-md border border-[#0000001f] bg-[#f8f8fa] px-2 py-1 text-sm text-black tabular-nums focus:border-[#5505af] focus:outline-none focus:ring-1 focus:ring-[#5505af]/20"
              />
            </SettingRow>
            <div className="px-4 pb-3">
              <label className="mb-1 block text-sm text-[#3d3d3d]">System prompt</label>
              <textarea
                rows={4}
                value={settings.systemPrompt}
                onChange={(e) => update('systemPrompt', e.target.value)}
                placeholder="Enter system prompt (sent before each conversation)…"
                className="w-full resize-none rounded-lg border border-[#0000001f] bg-[#f8f8fa] p-3 text-sm text-black placeholder-[#6d6d6d] focus:border-[#5505af] focus:outline-none focus:ring-1 focus:ring-[#5505af]/20"
              />
              <p className="mt-1 text-[11px] text-[#6d6d6d]">
                Appended to the start of every new conversation's context.
              </p>
            </div>
            <SettingRow>
              <span className="text-sm text-[#3d3d3d]">Auto-summarize titles</span>
              <Toggle
                enabled={settings.autoSummarize}
                onChange={() => update('autoSummarize', !settings.autoSummarize)}
                label="Auto-summarize"
              />
            </SettingRow>
          </Section>

          {/* Token Budget */}
          <Section label="Token Budget" icon={<Gauge className="h-4 w-4 text-[#5505af]" />}>
            <SettingRow>
              <span className="text-sm text-[#3d3d3d]">
                {settings.tokenBudget != null
                  ? `Budget: ${settings.tokenBudget.toLocaleString()} tokens`
                  : 'No budget limit'}
              </span>
              <Toggle
                enabled={settings.tokenBudget != null}
                onChange={handleBudgetToggle}
                label="Toggle token budget"
              />
            </SettingRow>
            {settings.tokenBudget != null && (
              <div className="px-4 pb-3">
                <input
                  type="range"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={settings.tokenBudget}
                  onChange={(e) => update('tokenBudget', Number(e.target.value))}
                  className="w-full accent-[#5505af]"
                  style={{ accentColor: isDestructive ? '#dc2626' : '#5505af' }}
                />
                <div className="mt-1 flex items-center gap-1">
                  <span className={`text-[11px] font-medium tabular-nums ${isDestructive ? 'text-red-600' : 'text-[#6d6d6d]'}`}>
                    {settings.tokenBudget.toLocaleString()} tokens
                  </span>
                  {totalTokenCount > 0 && (
                    <span className="text-[11px] text-[#6d6d6d]">
                      · {totalTokenCount.toLocaleString()} used
                      {Math.round((totalTokenCount / settings.tokenBudget) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            )}
          </Section>

          {/* Data */}
          <Section label="Data" icon={<FileDown className="h-4 w-4 text-[#5505af]" />}>
            <p className="px-4 pb-2 text-[11px] text-[#6d6d6d]">
              All settings are stored locally in your browser via localStorage.
            </p>
            <div className="p-4 pt-0">
              <button
                onClick={onResetDefaults}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
          </Section>

          {/* Code Execution */}
          <Section label="Code Execution" icon={<Code className="h-4 w-4 text-[#5505af]" />}>
            <SettingRow>
              <span className="text-sm text-[#3d3d3d]">JavaScript</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700">Always on</span>
            </SettingRow>
            <p className="px-4 pb-2 text-[11px] text-[#6d6d6d]">
              Runs in a sandboxed Web Worker (no DOM access).
            </p>
            <SettingRow>
              <span className="text-sm text-[#3d3d3d]">Python</span>
              <Toggle
                enabled={settings.enablePythonExec ?? false}
                onChange={() => update('enablePythonExec', !settings.enablePythonExec)}
                label="Enable Python execution"
              />
            </SettingRow>
            {settings.enablePythonExec && (
              <p className="px-4 pb-2 text-[11px] text-[#6d6d6d]">
                Loads Pyodide (~10 MB) from CDN on first use.
              </p>
            )}
            <SettingRow>
              <span className="text-sm text-[#3d3d3d]">SQL (SQLite)</span>
              <Toggle
                enabled={settings.enableSQLExec ?? false}
                onChange={() => update('enableSQLExec', !settings.enableSQLExec)}
                label="Enable SQL execution"
              />
            </SettingRow>
            {settings.enableSQLExec && (
              <p className="px-4 pb-2 text-[11px] text-[#6d6d6d]">
                Loads sql.js (~500 KB) from CDN. Runs in memory per execution.
              </p>
            )}
          </Section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#0000001f] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#0000001f] px-4 py-3">
        {icon}
        <h2 className="text-sm font-semibold text-black">{label}</h2>
      </div>
      <div className="divide-y divide-[#0000000d]">{children}</div>
    </div>
  );
}

function SettingRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      {children}
    </div>
  );
}
