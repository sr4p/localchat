'use client';

import dynamic from 'next/dynamic';
import { LLMProvider } from './hooks/LLMProvider';
import { EmbeddingProvider } from './hooks/EmbeddingProvider';

// Disable SSR — the entire app depends on WebGPU and browser-only APIs
const App = dynamic(() => import('./App'), { ssr: false });

export function ClientOnly() {
  return (
    <EmbeddingProvider>
      <LLMProvider>
        <App />
      </LLMProvider>
    </EmbeddingProvider>
  );
}
