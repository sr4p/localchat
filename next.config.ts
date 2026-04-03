import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cross-origin isolation is required for SharedArrayBuffer (WebGPU/ONNX multithreading)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },

  // Keep @huggingface/transformers out of the server bundle — it only runs in the browser
  serverExternalPackages: ["@huggingface/transformers"],

  // Turbopack is the default bundler in Next.js 16
  // Set root explicitly to avoid false-positive "multiple lockfiles" warning
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
