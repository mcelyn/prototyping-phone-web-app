"use client";

import { useEffect, useRef } from "react";

/**
 * Animated Gradient Wave Ripple Background
 * Recreates the exact glowing arch/wave aesthetic from the reference image:
 * Deep midnight navy at top, transitioning through an undulating ripple dome
 * with neon orange/vermilion, vibrant fuchsia pink, and luminous chartreuse/lime,
 * cycling smoothly through different color spectrums over time.
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
      time += 0.008;

      // Color cycle angle (cycles through color schemes smoothly)
      // Reference scheme: Sunset Ember (Navy -> Crimson -> Fiery Orange -> Neon Pink -> Pistachio)
      // Transitions into Cyber Aurora, Twilight Orchid, and Tropic Dawn
      const cycle = time * 0.25;
      const hueShift = Math.sin(cycle) * 45; // shifts palette harmoniously

      // 1. Fill base midnight background
      const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
      baseGrad.addColorStop(0, `hsl(${220 + hueShift * 0.3}, 38%, 10%)`);
      baseGrad.addColorStop(0.65, `hsl(${225 + hueShift * 0.3}, 35%, 8%)`);
      baseGrad.addColorStop(1, `hsl(${230 + hueShift * 0.3}, 40%, 6%)`);
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      // Wave dome parameters
      const domeH = height * 0.68; // height of the radiant wave arch
      const baseY = height;

      // Draw 3 layered undulating wave domes for depth & gentle ripple
      const layers = [
        {
          amp: 24,
          freq: 0.0028,
          speed: 1.1,
          offset: 0,
          scaleH: 1.0,
          opacity: 0.95,
        },
        {
          amp: 18,
          freq: 0.0042,
          speed: -0.85,
          offset: 1.5,
          scaleH: 0.88,
          opacity: 0.85,
        },
        {
          amp: 12,
          freq: 0.0055,
          speed: 1.4,
          offset: 3.2,
          scaleH: 0.72,
          opacity: 0.9,
        },
      ];

      layers.forEach((layer) => {
        const currentH = domeH * layer.scaleH;
        const peakY = baseY - currentH;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, height);

        // Compute parabolic arch with sinusoidal ripple
        const segments = 45;
        const dx = width / segments;

        for (let i = 0; i <= segments; i++) {
          const x = i * dx;
          // Normalized -1 to 1 from center
          const nx = (x - width / 2) / (width / 2);
          // Parabolic bell curve shape matching the reference image dome
          const arch = Math.max(0, 1 - Math.pow(Math.abs(nx), 1.7));

          // Gentle undulating ripples propagating across the crest
          const ripple =
            Math.sin(x * layer.freq + time * layer.speed + layer.offset) * layer.amp +
            Math.cos(x * layer.freq * 1.8 - time * 0.6) * (layer.amp * 0.45);

          const y = baseY - arch * currentH + ripple * (arch * 0.8 + 0.2);

          if (i === 0) {
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        // Multi-stop radiant gradient matching image:
        // Top: Deep Crimson / Ember
        // Mid-top: Neon Orange / Vermilion
        // Mid: Hot Fuchsia / Pink
        // Bottom: Luminous Chartreuse / Pistachio
        const grad = ctx.createLinearGradient(width / 2, peakY - 30, width / 2, height);

        // Dynamic cycling colors
        const h1 = (12 + hueShift + 360) % 360; // Crimson / Ember
        const h2 = (22 + hueShift + 360) % 360; // Fiery Orange
        const h3 = (335 + hueShift + 360) % 360; // Fuchsia Pink
        const h4 = (85 + hueShift + 360) % 360; // Luminous Chartreuse

        grad.addColorStop(0, `hsla(${h1}, 95%, 45%, 0)`);
        grad.addColorStop(0.18, `hsla(${h1}, 98%, 48%, ${0.55 * layer.opacity})`);
        grad.addColorStop(0.42, `hsla(${h2}, 100%, 55%, ${0.92 * layer.opacity})`);
        grad.addColorStop(0.68, `hsla(${h3}, 98%, 62%, ${0.95 * layer.opacity})`);
        grad.addColorStop(0.92, `hsla(${h4}, 92%, 78%, ${0.98 * layer.opacity})`);
        grad.addColorStop(1, `hsla(${h4}, 85%, 85%, ${1 * layer.opacity})`);

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });

      // Ambient radial bloom overlay at the base for atmospheric glow
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const bloom = ctx.createRadialGradient(
        width / 2,
        height,
        height * 0.1,
        width / 2,
        height * 0.4,
        width * 0.85
      );
      const bloomHue = (30 + hueShift + 360) % 360;
      bloom.addColorStop(0, `hsla(${bloomHue}, 90%, 65%, 0.3)`);
      bloom.addColorStop(0.5, `hsla(${bloomHue - 15}, 95%, 55%, 0.15)`);
      bloom.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = bloom;
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
