import type { ExecutionResult } from './jsWorkerRunner';

export interface SQLResult extends ExecutionResult {
  rows: Array<Record<string, unknown>>[];
  columns: string[][];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InitSqlJsFn = (config?: { locateFile?: (file: string) => string }) => Promise<any>;

let initSqlJs: InitSqlJsFn | null = null;
let loadingPromise: Promise<InitSqlJsFn> | null = null;

async function loadSqlJs(): Promise<InitSqlJsFn> {
  if (initSqlJs) return initSqlJs;
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.js';
    script.onload = () => {
      const mod = (window as unknown as Record<string, unknown>).initSqlJs as InitSqlJsFn | undefined;
      if (mod) { initSqlJs = mod; resolve(mod); }
      else reject(new Error('sql.js loaded but initSqlJs not found on window'));
    };
    script.onerror = () => reject(new Error('Failed to load sql.js from CDN'));
    document.head.appendChild(script);
  });

  return loadingPromise;
}

export function isSqlLoaded(): boolean {
  return initSqlJs !== null;
}

/**
 * Execute SQL code via sql.js (SQLite in-browser).
 * Creates a fresh in-memory DB per execution.
 */
export async function runSQL(code: string): Promise<SQLResult> {
  let loadError: string | null = null;

  try {
    const SQL = await loadSqlJs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = await SQL({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/${f}`,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = new api.Database();

    const start = performance.now();
    const output: string[] = [];
    const rows: Array<Record<string, unknown>>[] = [];
    const columns: string[][] = [];

    try {
      const statements = code.split(';').map((s) => s.trim()).filter(Boolean);

      for (const stmt of statements) {
        const lower = stmt.toLowerCase();
        if (lower.startsWith('select') || lower.startsWith('with') || lower.startsWith('pragma')) {
          const results = db.exec(stmt) as { columns: string[]; values: unknown[][] }[];
          for (const r of results) {
            columns.push(r.columns);
            const rowObjects = r.values.map((vals) =>
              Object.fromEntries(r.columns.map((col, i) => [col, vals[i]])),
            );
            rows.push(rowObjects);
            output.push(`Query OK, ${rowObjects.length} row(s) returned`);
          }
          if (results.length === 0) {
            rows.push([]);
            columns.push([]);
            output.push('Query OK, 0 rows returned');
          }
        } else {
          const runResult = db.run(stmt);
          const changes = runResult.changes ?? 0;
          output.push(`${changes} row(s) affected`);
        }
      }
    } catch (execErr: unknown) {
      return {
        output: output.join('\n'),
        error: execErr instanceof Error ? execErr.message : String(execErr),
        result: '',
        durationMs: performance.now() - start,
        rows,
        columns,
      };
    } finally {
      db.close();
    }

    return {
      output: output.join('\n'),
      error: null,
      result: '',
      durationMs: performance.now() - start,
      rows,
      columns,
    };
  } catch (err: unknown) {
    return {
      output: '',
      error: loadError ?? (err instanceof Error ? err.message : String(err)),
      result: '',
      durationMs: 0,
      rows: [],
      columns: [],
    };
  }
}
