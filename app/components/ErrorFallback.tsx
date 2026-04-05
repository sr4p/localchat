import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorFallbackProps {
  onReset: () => void;
  error?: Error | null;
}

export function ErrorFallback({ onReset, error }: ErrorFallbackProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white text-black dark:bg-[#1a1a2e] dark:text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-lg dark:border-red-900/50 dark:bg-red-950/40">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h2 className="mb-2 text-xl font-semibold text-red-900 dark:text-red-200">
          Something went wrong
        </h2>
        <p className="mb-4 text-sm text-red-700 dark:text-red-400">
          {error?.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
