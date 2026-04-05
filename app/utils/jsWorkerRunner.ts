export interface ExecutionResult {
  output: string;
  error: string | null;
  result: string;
  durationMs: number;
}

const WORKER_SOURCE = `
self.onmessage = function(e) {
  const code = e.data.code;
  const logs = [];
  const errors = [];
  let result = undefined;
  let error = null;

  const startTime = performance.now();
  const timeout = setTimeout(() => {
    self.postMessage({ output: logs.join('\\n'), error: 'Execution timed out (10s)', result: String(result), durationMs: performance.now() - startTime });
    self.close();
  }, 10000);

  try {
    const patchedConsole = {
      log: (...args) => { logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')); },
      warn: (...args) => { logs.push('[Warning] ' + args.map(a => String(a)).join(' ')); },
      error: (...args) => { errors.push(args.map(a => String(a)).join(' ')); },
    };

    const fn = new Function('console', \`\${code}\`);
    result = fn(patchedConsole);

    clearTimeout(timeout);
    const duration = performance.now() - startTime;
    self.postMessage({ output: logs.join('\\n'), error: errors.length ? errors.join('\\n') : null, result: result !== undefined ? String(result) : '', durationMs: duration });
  } catch (err) {
    clearTimeout(timeout);
    const duration = performance.now() - startTime;
    self.postMessage({ output: logs.join('\\n'), error: String(err), result: '', durationMs: duration });
  }
};
`;

function createWorker(): Worker {
  const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

/**
 * Execute JavaScript in a sandboxed Web Worker.
 * No access to window, document, or DOM. 10s timeout.
 */
export function runJavaScript(code: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const worker = createWorker();

    worker.onmessage = (e) => {
      resolve(e.data as ExecutionResult);
      worker.terminate();
    };

    worker.onerror = (err) => {
      worker.terminate();
      resolve({ output: '', error: `Worker error: ${(err as ErrorEvent).message ?? err}`, result: '', durationMs: 0 });
    };

    worker.postMessage({ code });
  });
}
