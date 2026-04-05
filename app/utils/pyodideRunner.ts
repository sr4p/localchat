import type { ExecutionResult } from './jsWorkerRunner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PYODIDE_CDN_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loadingPromise: Promise<any> | null = null;

async function loadPyodide(): Promise<any> {
  if (pyodide) return pyodide;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const mod = await import(/* webpackIgnore: true */ PYODIDE_CDN_URL);
    const py = await mod.loadPyodide();
    pyodide = py;
    return py;
  })();

  return loadingPromise;
}

export function isPyodideLoaded(): boolean {
  return pyodide !== null;
}

export async function runPython(code: string): Promise<ExecutionResult> {
  const logs: string[] = [];
  const errs: string[] = [];

  try {
    const py = await loadPyodide();

    // Capture stdout/stderr
    py.setStdout({
      batched: (msg: string) => { logs.push(msg); },
    });
    py.setStderr({
      batched: (msg: string) => { errs.push(msg); },
    });

    const start = performance.now();
    let result = '';
    let error: string | null = null;

    try {
      result = String(py.runPython(code));
    } catch (execErr: unknown) {
      error = execErr instanceof Error ? execErr.message : String(execErr);
    }

    return {
      output: logs.join('\n'),
      error: error ?? (errs.length > 0 ? errs.join('\n') : null),
      result,
      durationMs: performance.now() - start,
    };
  } catch (loadErr: unknown) {
    return {
      output: '',
      error: `Failed to load Pyodide: ${loadErr instanceof Error ? loadErr.message : String(loadErr)}`,
      result: '',
      durationMs: 0,
    };
  }
}
