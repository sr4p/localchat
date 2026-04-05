import { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Loader2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { CustomRendererProps } from 'streamdown';
import { useCodeExec } from '../context/CodeExecContext';
import type { ExecutionResult } from '../utils/jsWorkerRunner';
import { runJavaScript } from '../utils/jsWorkerRunner';
import { runPython, isPyodideLoaded } from '../utils/pyodideRunner';
import { runSQL, type SQLResult } from '../utils/sqlRunner';
import { code as shikiPlugin } from '@streamdown/code';

const RUNNABLE_LANGS: Record<string, string> = {
  javascript: 'js',
  js: 'js',
  typescript: 'js',
  ts: 'js',
  python: 'py',
  py: 'py',
  sql: 'sql',
  sqlite: 'sql',
};

function normalizeLang(lang: string): string | null {
  const lower = lang.toLowerCase();
  return RUNNABLE_LANGS[lower] ?? null;
}

function canExecute(lang: string, settings: { enablePythonExec: boolean; enableSQLExec: boolean }): boolean {
  const n = normalizeLang(lang);
  if (n === 'js') return true;
  if (n === 'py') return settings.enablePythonExec;
  if (n === 'sql') return settings.enableSQLExec;
  return false;
}

/** Render Shiki tokens to HTML spans. */
function renderHighlighted(tokens: { content: string; htmlStyle?: Record<string, string> }[][]) {
  return tokens.map((line, li) => (
    <span key={li}>
      {line.map((token, ti) => (
        <span key={ti} style={token.htmlStyle}>{token.content}</span>
      ))}
      {li < tokens.length - 1 ? '\n' : ''}
    </span>
  ));
}

function HighlightedCode({ code, language }: { code: string; language: string }) {
  const [spans, setSpans] = useState<React.ReactNode>(null);
  const langRef = useRef(language);

  useEffect(() => {
    // language changed mid-render — reset
    if (language !== langRef.current) {
      langRef.current = language;
      setSpans(null);
    }

    const themes = shikiPlugin.getThemes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lang = language.toLowerCase() as any;
    const result = shikiPlugin.highlight({ code, language: lang, themes });

    if (result) {
      setSpans(renderHighlighted(result.tokens));
    } else {
      // Async loading — use callback
      shikiPlugin.highlight({ code, language: lang, themes }, (r) => {
        setSpans(renderHighlighted(r.tokens));
      });
    }
  }, [code, language]);

  if (spans) {
    return <code className="font-mono">{spans}</code>;
  }

  return <code className="font-mono">{code}</code>;
}

export function ExecutableCodeBlock({ code, language, isIncomplete }: CustomRendererProps) {
  const settings = useCodeExec();
  const normalized = normalizeLang(language) ?? language.toLowerCase();
  const executable = canExecute(language, settings);

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [sqlRows, setSqlRows] = useState<Array<Record<string, unknown>>[] | null>(null);
  const [sqlColumns, setSqlColumns] = useState<string[] | null>(null);
  const [pyLoading, setPyLoading] = useState(false);
  const [pyProgress, setPyProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    if (!executable || isIncomplete) return;

    setIsRunning(true);
    setResult(null);
    setSqlRows(null);
    setSqlColumns(null);
    setError(null);
    setShowOutput(true);

    if (normalized === 'py' && !isPyodideLoaded()) {
      setPyLoading(true);
      setPyProgress('Loading Pyodide (~10 MB)…');
    }

    try {
      let res: ExecutionResult;

      if (normalized === 'js') {
        res = await runJavaScript(code);
      } else if (normalized === 'py') {
        res = await runPython(code);
        setPyLoading(false);
        setPyProgress('');
      } else if (normalized === 'sql') {
        const sqlRes = await runSQL(code) as SQLResult;
        res = {
          output: sqlRes.output,
          error: sqlRes.error,
          result: sqlRes.result,
          durationMs: sqlRes.durationMs,
        };
        if (sqlRes.rows && sqlRes.rows.length > 0) {
          setSqlRows(sqlRes.rows);
          setSqlColumns(sqlRes.columns[0] ?? null);
        }
      } else {
        setIsRunning(false);
        return;
      }

      setResult(res);
      if (res.error) setError(res.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
      setPyLoading(false);
      setPyProgress('');
    }
  }, [code, executable, isIncomplete, normalized]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  // Fallback for non-executable languages
  if (!executable) {
    return (
      <div className="my-3 overflow-hidden rounded-lg border border-[#0000001f] bg-[#fafafa]">
        <div className="flex items-center justify-between border-b border-[#0000001f] bg-[#f5f5f5] px-3 py-1.5">
          <span className="font-mono text-xs uppercase tracking-wide text-[#6d6d6d]">{language || 'code'}</span>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-[#1a1a2e]">
          <HighlightedCode code={code} language={language} />
        </pre>
      </div>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-[#0000001f] bg-[#fafafa] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#0000001f] bg-[#f5f5f5] px-3 py-1.5">
        <span className="font-mono text-xs font-medium uppercase tracking-wide text-[#5505af]">{language || 'code'}</span>
        <div className="flex items-center gap-1.5">
          {/* Copy */}
          <button
            onClick={handleCopy}
            className="rounded-md p-1 text-[#8888aa] hover:text-[#5505af] hover:bg-[#ede7fa] transition-colors cursor-pointer"
            title="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {/* Run */}
          <button
            onClick={handleRun}
            disabled={isRunning || pyLoading || isIncomplete}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium text-white transition-colors cursor-pointer flex items-center gap-1.5
              ${isRunning || pyLoading || isIncomplete
                ? 'bg-[#5505af]/50 cursor-not-allowed'
                : 'bg-[#5505af] hover:bg-[#44048f] active:bg-[#6e15c6]'
              }`}
          >
            {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            {pyLoading ? 'Loading…' : 'Run'}
          </button>
        </div>
      </div>

      {/* Code */}
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed whitespace-pre">
        <HighlightedCode code={code} language={language} />
      </pre>

      {/* Pyodide loading indicator */}
      {pyLoading && (
        <div className="border-t border-[#0000001f] bg-[#ede7fa] px-4 py-2 text-[11px] text-[#5505af] flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          {pyProgress}
        </div>
      )}

      {/* Output toggle */}
      {(result || error) && (
        <div className="border-t border-[#0000001f]">
          <button
            onClick={() => setShowOutput((p) => !p)}
            className="w-full flex items-center justify-between border-[#0000000d] bg-[#f0f0f5] px-3 py-1.5 text-[11px] font-medium text-[#6d6d6d] hover:bg-[#e8e8ef] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              {error ? (
                <span className="text-red-600">● Error</span>
              ) : (
                <span className="text-emerald-600">● Output</span>
              )}
              {result && <span className="text-[#999]">{Math.round(result.durationMs)}ms</span>}
            </span>
            {showOutput ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showOutput && (
            <div>
              {/* Text output */}
              {(result?.output || result?.result || error) && (
                <pre className={`overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre ${error ? 'bg-red-50 text-red-700' : 'bg-white text-[#1a1a2e]'}`}>
                  <code className="font-mono">
                    {error || result?.output || result?.result}
                  </code>
                </pre>
              )}

              {/* SQL table */}
              {sqlColumns && sqlRows && sqlRows[0]?.length > 0 && (
                <div className="overflow-x-auto bg-white">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#0000001f] bg-[#f5f5f5]">
                        {sqlColumns.map((col) => (
                          <th key={col} className="px-3 py-1.5 text-left font-semibold text-[#5505af] whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sqlRows.map((rows, ri) =>
                        rows.map((row, i) => (
                          <tr key={`${ri}-${i}`} className="border-b border-[#0000000d] hover:bg-[#fafafa]">
                            {sqlColumns!.map((col) => (
                              <td key={col} className="px-3 py-1.5 whitespace-nowrap font-mono text-[#1a1a2e]">
                                {row[col] == null ? <span className="text-[#999] italic">null</span> : String(row[col])}
                              </td>
                            ))}
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
