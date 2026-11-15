"use client";

import { useEffect, useRef, useState } from "react";

// Brand colours: gold, ball red, pitch green, white and sky.
const COLORS = ["#d4a537", "#c8261d", "#34d399", "#ffffff", "#7dd3fc"];
const PIECES_PER_POPPER = 90;
const DURATION_MS = 4200;
const GRAVITY = 0.32;
const DRAG = 0.985;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  spin: number;
  angle: number;
  round: boolean;
};

// Two party poppers fire from the bottom corners of the screen. Draws on one
// canvas that ignores clicks and removes itself when the pieces have fallen.
// Skipped for visitors who ask their device for reduced motion.
export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);

    // Fast enough to reach the top half on any screen size.
    const power = Math.sqrt(height) * 0.95;
    const popper = (fromLeft: boolean): Piece[] =>
      Array.from({ length: PIECES_PER_POPPER }, () => {
        const angle = ((fromLeft ? 60 : 120) + (Math.random() - 0.5) * 40) * (Math.PI / 180);
        const speed = power * (0.55 + Math.random() * 0.6);
        return {
          x: fromLeft ? 0 : width,
          y: height,
          vx: Math.cos(angle) * speed,
          vy: -Math.sin(angle) * speed,
          size: 6 + Math.random() * 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          spin: (Math.random() - 0.5) * 0.4,
          angle: Math.random() * Math.PI,
          round: Math.random() < 0.3,
        };
      });
    const pieces = [...popper(true), ...popper(false)];

    const start = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - DURATION_MS * 0.7) / (DURATION_MS * 0.3));
      for (const p of pieces) {
        p.vx *= DRAG;
        p.vy = p.vy * DRAG + GRAVITY;
        p.x += p.vx + Math.sin(p.angle) * 0.6;
        p.y += p.vy;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Squashing the width with cos(angle) makes ribbons look like they flip.
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size * Math.cos(p.angle * 1.7), p.size / 2);
        }
        ctx.restore();
      }
      if (elapsed < DURATION_MS) frame = requestAnimationFrame(draw);
      else setDone(true);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (done) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] size-full"
    />
  );
}
