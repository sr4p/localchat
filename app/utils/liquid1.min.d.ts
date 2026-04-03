interface LiquidApp {
  liquidPlane: {
    material: {
      metalness: number;
      roughness: number;
    };
    uniforms: {
      displacementScale: { value: number };
    };
  };
  loadImage(url: string): void;
  setRain(enabled: boolean): void;
  dispose(): void;
}

declare function LiquidBackground(canvas: HTMLCanvasElement): LiquidApp;
export default LiquidBackground;
