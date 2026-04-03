import type { Metadata } from 'next';
import './index.css';

export const metadata: Metadata = {
  title: 'LFM2.5 WebGPU',
  description: 'Run LFM2.5 Thinking locally in your browser using WebGPU',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💧</text></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
