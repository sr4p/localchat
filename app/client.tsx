'use client';

import dynamic from 'next/dynamic';
import { LLMProvider } from './hooks/LLMProvider';
import { EmbeddingProvider } from './hooks/EmbeddingProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastContainer';

// Disable SSR — the entire app depends on WebGPU and browser-only APIs
const App = dynamic(() => import('./App'), { ssr: false });

export function ClientOnly() {
  return (
    <ErrorBoundary>
      <EmbeddingProvider>
        <LLMProvider>
          <App />
          <ToastContainer />
        </LLMProvider>
      </EmbeddingProvider>
    </ErrorBoundary>
  );
}