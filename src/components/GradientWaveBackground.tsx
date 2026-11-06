"use client";

import { useEffect, useRef } from "react";

/**
 * Textured Grain Gradient Background
 * Recreates the exact warm, moody analog aesthetic from the reference images:
 * - Fluid, breathing multi-point mesh gradients drifting smoothly between deep crimson,
 *   velvety fuchsia, cosmic purple, and nocturnal plum.
 * - Tactile, high-density film grain texture overlay matching the uploaded reference photos.
 */
export default function GradientWaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Pre-generate a high-density, realistic analog film grain pattern
    const noiseCanvas = document.createElement("canvas");
    const noiseSize = 256;
    noiseCanvas.width = noiseSize;
    noiseCanvas.height = noiseSize;
    const nCtx = noiseCanvas.getContext("2d");

    if (nCtx) {
      const imgData = nCtx.createImageData(noiseSize, noiseSize);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        // High frequency fine-grain film noise
        const noise = Math.floor(Math.random() * 255);
        data[i] = noise;
        data[i + 1] = noise;
        data[i + 2] = noise;
        data[i + 3] = 42; // Opacity for rich tactile grain
      }
      nCtx.putImageData(imgData, 0, 0);
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
    };

    window.addEventListener("resize", resize);
    resize();

    let time = 0;

    const render = () => {
      time += 0.006;

      // Base cycling hue shift (transitions between crimson/scarlet and deep purple/fuchsia)
      const cycle = time * 0.4;
      const hueShift = Math.sin(cycle) * 45; // shifts between ~330 (fuchsia/purple) and ~15 (crimson/ember)

      // 1. Deep Midnight Base Background (Velvety dark plum/black)
      const baseHue = (310 + hueShift * 0.5 + 360) % 360;
      ctx.fillStyle = `hsl(${baseHue}, 45%, 6%)`;
      ctx.fillRect(0, 0, width, height);

      // 2. Multi-point atmospheric gradient blobs (Matching reference images)
      // Blob 1: Crimson / Scarlet orb (center-left drifting)
      const b1x = width * (0.35 + Math.sin(time * 0.8) * 0.15);
      const b1y = height * (0.38 + Math.cos(time * 0.7) * 0.12);
      const b1r = Math.max(width, height) * 0.75;
      const b1Hue = (355 + hueShift + 360) % 360; // rich scarlet/red
      const grad1 = ctx.createRadialGradient(b1x, b1y, 0, b1x, b1y, b1r);
      grad1.addColorStop(0, `hsla(${b1Hue}, 85%, 46%, 0.85)`);
      grad1.addColorStop(0.45, `hsla(${b1Hue - 15}, 80%, 35%, 0.5)`);
      grad1.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // Blob 2: Velvety Purple / Magenta orb (top-left & diagonal)
      const b2x = width * (0.2 + Math.cos(time * 0.6) * 0.12);
      const b2y = height * (0.2 + Math.sin(time * 0.9) * 0.1);
      const b2r = Math.max(width, height) * 0.65;
      const b2Hue = (295 + hueShift + 360) % 360; // deep royal purple / fuchsia
      const grad2 = ctx.createRadialGradient(b2x, b2y, 0, b2x, b2y, b2r);
      grad2.addColorStop(0, `hsla(${b2Hue}, 80%, 48%, 0.75)`);
      grad2.addColorStop(0.5, `hsla(${b2Hue}, 75%, 32%, 0.4)`);
      grad2.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // Blob 3: Warm Amber / Sunset Glow (subtle bottom-right counterpoint)
      const b3x = width * (0.75 + Math.sin(time * 0.75) * 0.12);
      const b3y = height * (0.68 + Math.cos(time * 0.85) * 0.14);
      const b3r = Math.max(width, height) * 0.6;
      const b3Hue = (20 + hueShift + 360) % 360; // warm ember
      const grad3 = ctx.createRadialGradient(b3x, b3y, 0, b3x, b3y, b3r);
      grad3.addColorStop(0, `hsla(${b3Hue}, 90%, 50%, 0.65)`);
      grad3.addColorStop(0.55, `hsla(${b3Hue - 20}, 85%, 32%, 0.35)`);
      grad3.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // 3. Tactile Film Grain Overlay (Exactly matching images 1 & 2)
      if (nCtx) {
        ctx.save();
        ctx.globalCompositeOperation = "overlay";
        const pattern = ctx.createPattern(noiseCanvas, "repeat");
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.restore();
      }

      // 4. Subtle Natural Vignette for depth
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.35,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.8
      );
      vignette.addColorStop(0, "rgba(255, 255, 255, 0)");
      vignette.addColorStop(1, "rgba(10, 5, 12, 0.55)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none -z-10 block"
      style={{
        transform: "translate3d(0, 0, 0)",
        willChange: "transform",
      }}
    />
  );
}
