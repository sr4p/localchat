/**
 * Liquid effect adapted from https://www.framer.com/@kevin-levron/
 */
import { useEffect, useRef, useCallback, useState } from "react";
import LiquidBackground from "../utils/liquid1.min.js";

type LiquidApp = ReturnType<typeof LiquidBackground>;

interface LiquidIntroProps {
  onEnter: () => void;
}

export function LiquidIntro({ onEnter }: LiquidIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<LiquidApp | null>(null);
  const [fading, setFading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function init() {
      if (disposed || !canvasRef.current) return;

      const app = LiquidBackground(canvasRef.current);
      appRef.current = app;

      app.loadImage("/liquid-dark.webp");
      app.liquidPlane.material.metalness = 0.75;
      app.liquidPlane.material.roughness = 0.58;
      app.liquidPlane.uniforms.displacementScale.value = 5;
      app.setRain(false);

      // Small delay to let the first frame render
      setTimeout(() => {
        if (!disposed) setReady(true);
      }, 300);
    }

    init();

    return () => {
      disposed = true;
      if (appRef.current) {
        appRef.current.dispose();
        appRef.current = null;
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (fading) return;
    setFading(true);
    setTimeout(() => {
      if (appRef.current) {
        appRef.current.dispose();
        appRef.current = null;
      }
      onEnter();
    }, 600);
  }, [fading, onEnter]);

  return (
    <div
      className="absolute inset-0 z-30 cursor-pointer"
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute inset-0 flex flex-col items-center justify-end transition-opacity duration-500 pb-10 ${
          fading ? "opacity-0" : ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <h1 className="text-6xl sm:text-7xl font-bold tracking-tight select-none">
          <span className="text-black">LFM2.5</span>{" "}
          <span className="text-gray-900">WebGPU</span>
        </h1>

        <p className="mt-6 text-lg text-gray-800 select-none animate-pulse-gentle">
          Click anywhere to start
        </p>
      </div>

      <div
        className={`absolute bottom-4 right-4 text-right text-gray-500/70 select-none transition-opacity duration-500 flex flex-col space-y-[4px] ${
          fading ? "opacity-0" : ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <a
          href="https://codepen.io/soju22/pen/myVWBGa"
          target="_blank"
          rel="noreferrer"
          className="hover:text-gray-800 transition-colors text-[14px]"
          onClick={(e) => e.stopPropagation()}
        >
          Liquid effect by Kevin Levron
        </a>
        <a
          href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
          target="_blank"
          rel="noreferrer"
          className="hover:text-gray-800 transition-colors text-[12px]"
          onClick={(e) => e.stopPropagation()}
        >
          Licensed under CC BY-NC-SA 4.0
        </a>
      </div>

      <div
        className={`absolute inset-0 bg-white transition-opacity duration-600 pointer-events-none ${
          fading ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
