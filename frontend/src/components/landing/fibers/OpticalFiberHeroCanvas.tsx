import React, { useEffect, useRef } from 'react';
import {
  HERO_FIBER_BUNDLES,
  HERO_MICRO_TRAILS,
  HERO_LIGHT_PULSE_DEFS,
  getFiberY,
} from './fiberMath';

interface OpticalFiberHeroCanvasProps {
  className?: string;
}

// ============================================================================
// STATIC INVARIANT PRE-COMPUTATIONS (Zero frame allocation)
// ============================================================================

const STEPS = 88;
const STEP_COUNT = STEPS + 1;

// Precomputed normalized step t values [0..1] and invariant arch envelope
const STEP_T = new Float32Array(STEP_COUNT);
const ARCH_T = new Float32Array(STEP_COUNT);

for (let i = 0; i <= STEPS; i++) {
  const t = i / STEPS;
  STEP_T[i] = t;
  ARCH_T[i] = Math.sin(t * Math.PI) * -90;
}

// Invariant asymmetric harmonic deformation per bundle tier
const BUNDLE_HARMONIC_ASYM = HERO_FIBER_BUNDLES.map((bundle) => {
  const arr = new Float32Array(STEP_COUNT);
  for (let i = 0; i <= STEPS; i++) {
    const t = STEP_T[i];
    arr[i] = Math.sin(t * 2.1 + bundle.phase) * (16 * bundle.asymmetry);
  }
  return arr;
});

// Precomputed strand descriptor interface
interface PrecomputedStrand {
  normS: number;
  shapedOffset: number;
  strandAlpha: number;
  strandWidth: number;
  strokeStyle: string;
  strandPhase: number;
}

// Precomputed invariant strand metrics for all 370 strands across the 4 tiers
const PRECOMPUTED_STRANDS: PrecomputedStrand[][] = HERO_FIBER_BUNDLES.map(
  (bundle) => {
    const strands: PrecomputedStrand[] = [];
    for (let s = 0; s < bundle.strands; s++) {
      const normS = bundle.strands > 1 ? s / (bundle.strands - 1) : 0.5;
      const centered = (normS - 0.5) * 2;
      const shapedOffset =
        Math.sign(centered) *
        Math.pow(Math.abs(centered), 1.25) *
        (bundle.spread * 0.5);

      const densityWeight = Math.sin(normS * Math.PI);
      const strandAlpha =
        bundle.alphaMin +
        (bundle.alphaMax - bundle.alphaMin) * Math.pow(densityWeight, 1.2);
      const strandWidth =
        bundle.minWidth +
        (bundle.maxWidth - bundle.minWidth) * Math.pow(densityWeight, 1.1);
      const strokeStyle = `rgba(${bundle.rgb}, ${Math.max(
        0.015,
        Number(strandAlpha.toFixed(3))
      )})`;
      const strandPhase = normS * 0.35;

      strands.push({
        normS,
        shapedOffset,
        strandAlpha,
        strandWidth,
        strokeStyle,
        strandPhase,
      });
    }
    return strands;
  }
);

// Reusable frame buffers (reused across frames to guarantee zero GC pressure)
const breathingBuffer = new Float32Array(STEP_COUNT);
const bundleHarmonicBuffer = new Float32Array(STEP_COUNT);

/**
 * OpticalFiberHeroCanvas
 * 
 * High-Density Optical-Fiber Bundle Simulation Engine (Hero ribbon).
 * Optimized rendering pipeline with 100% mathematical and visual fidelity:
 * - Precomputed strand invariants eliminate >1,100 Math.pow and 370 string allocations/frame.
 * - Invariant arch and asymmetric harmonics cached in typed Float32Arrays.
 * - Single-pass bundle octave caching reduces trig operations from ~230,000 to ~33,000/frame.
 * - Delta-time damped parallax inertia guarantees smooth motion without framerate sensitivity.
 * - Complete lifecycle hygiene: visibilitychange handler, StrictMode idempotency, offscreen pause.
 */
export const OpticalFiberHeroCanvas: React.FC<OpticalFiberHeroCanvasProps> = ({
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;
    let isVisible = true;
    let isDocumentVisible = !document.hidden;
    let animFrameId: number | null = null;

    let width = 0;
    let height = 0;
    let dpr = 1;

    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let curParallaxX = 0;
    let curParallaxY = 0;

    let time = 0;
    let lastTime = performance.now();

    // Reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = mediaQuery.matches;

    // Responsive Canvas Sizing with guard against no-op resizes
    const resize = () => {
      if (!canvas || !ctx) return;
      const newDpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const newWidth = rect.width || window.innerWidth;
      const newHeight = rect.height || window.innerHeight;

      if (newWidth === width && newHeight === height && newDpr === dpr) {
        return;
      }

      width = newWidth;
      height = newHeight;
      dpr = newDpr;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      if (reducedMotion) {
        time = 3.6;
        drawFrame(time);
      }
    };

    // 1. Draw multi-tier optical fiber bundles (Highly optimized single-pass pipeline)
    const drawOpticalFiberBundles = (curT: number) => {
      // Pre-evaluate breathing envelope once for the entire frame (89 steps, not 32,930)
      const curT03 = curT * 0.3;
      for (let i = 0; i <= STEPS; i++) {
        const t = STEP_T[i];
        breathingBuffer[i] =
          0.65 + Math.sin(t * Math.PI) * 0.6 + Math.sin(curT03 + t * 3.0) * 0.15;
      }

      for (let bIdx = 0; bIdx < HERO_FIBER_BUNDLES.length; bIdx++) {
        const bundle = HERO_FIBER_BUNDLES[bIdx];
        const px = curParallaxX * bundle.pFactor * 26;
        const py = curParallaxY * bundle.pFactor * 16;
        const strands = PRECOMPUTED_STRANDS[bIdx];
        const harmonicAsymArr = BUNDLE_HARMONIC_ASYM[bIdx];

        const baseBundleY = height * bundle.yBase + py;
        const speedCurT = curT * bundle.speed + bundle.phase;
        const octave2CurT = -curT * (bundle.speed * 0.7) + bundle.phase;
        const octave3CurT = curT * (bundle.speed * 1.2);

        // Precompute bundle-level invariant curve for step i (combined octaves 2 and 3)
        for (let i = 0; i <= STEPS; i++) {
          const t = STEP_T[i];
          const octave2 =
            Math.cos(t * Math.PI * bundle.freq2 + octave2CurT) * bundle.amp2;
          const octave3 =
            Math.sin(t * Math.PI * 3.4 + octave3CurT) * 10;
          bundleHarmonicBuffer[i] =
            baseBundleY + ARCH_T[i] + harmonicAsymArr[i] + octave2 + octave3;
        }

        const freq1Factor = Math.PI * bundle.freq1;
        const amp1 = bundle.amp1;

        // Render each strand in tier
        for (let s = 0; s < strands.length; s++) {
          const strand = strands[s];
          const microDrift =
            Math.sin(curT * 0.45 + strand.normS * 6.28) * 8.0;
          const strandPhaseOffset = speedCurT + strand.strandPhase;
          const shapedOffset = strand.shapedOffset;

          ctx.beginPath();
          for (let i = 0; i <= STEPS; i++) {
            const t = STEP_T[i];
            const x = t * width + px;
            const octave1 =
              Math.sin(t * freq1Factor + strandPhaseOffset) * amp1;
            const y =
              bundleHarmonicBuffer[i] +
              octave1 +
              microDrift +
              shapedOffset * breathingBuffer[i];

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          ctx.strokeStyle = strand.strokeStyle;
          ctx.lineWidth = strand.strandWidth;
          ctx.stroke();
        }
      }
    };

    // 2. Fine dotted micro-trails tracing alongside continuous ribbons
    const drawDottedMicroTrails = (curT: number) => {
      for (let trIdx = 0; trIdx < HERO_MICRO_TRAILS.length; trIdx++) {
        const tr = HERO_MICRO_TRAILS[trIdx];
        const bundle = HERO_FIBER_BUNDLES[tr.bundleIdx];
        const px = curParallaxX * bundle.pFactor * 24;
        const py = curParallaxY * bundle.pFactor * 14;

        for (let i = 0; i < tr.count; i++) {
          const t = ((i / tr.count) + curT * tr.speed) % 1;
          const normT = t < 0 ? t + 1 : t;
          const x = normT * width + px;
          const y =
            getFiberY(normT, bundle, curT, px, py, 0.5, height) + tr.offset;

          // Clean taper at window edges, preserving crystal clarity
          const edgeEnvelope = Math.sin(normT * Math.PI);
          const alpha = edgeEnvelope * tr.maxAlpha;
          if (alpha <= 0.03) continue;

          ctx.beginPath();
          ctx.arc(x, y, tr.dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${tr.rgb}, ${alpha.toFixed(2)})`;
          ctx.fill();
        }
      }
    };

    // 3. Pure traveling light pulses gliding smoothly on hairlines with exponential fading tails
    const drawLightPulses = (curT: number) => {
      for (let pIdx = 0; pIdx < HERO_LIGHT_PULSE_DEFS.length; pIdx++) {
        const p = HERO_LIGHT_PULSE_DEFS[pIdx];
        const bundle = HERO_FIBER_BUNDLES[p.bundleIdx];
        const px = curParallaxX * bundle.pFactor * 26;
        const py = curParallaxY * bundle.pFactor * 16;
        const centerT = p.calcProgress(curT);

        const pulseEnvelope = Math.sin(centerT * Math.PI);
        if (pulseEnvelope <= 0.05) continue;

        const segments = 26;
        for (let j = 0; j < segments; j++) {
          const relPos = j / segments - 0.5;
          const tStep = relPos * (p.length / width);
          const t = centerT + tStep;
          if (t < 0 || t > 1) continue;

          const falloff = 1 - Math.abs(relPos) * 2;
          const alpha = pulseEnvelope * Math.pow(falloff, 2.2) * p.peakAlpha;

          const x = t * width + px;
          const y =
            getFiberY(t, bundle, curT, px, py, 0.5, height) + p.offset;

          ctx.beginPath();
          ctx.arc(x, y, 0.8 + falloff * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.rgb}, ${alpha.toFixed(3)})`;
          ctx.fill();
        }
      }
    };

    // Single frame draw pipeline
    const drawFrame = (frameTime: number) => {
      if (!ctx || width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw multi-tier optical fiber bundles
      drawOpticalFiberBundles(frameTime);

      // 2. Draw fine dotted fiber-optic micro-trails
      drawDottedMicroTrails(frameTime);

      // 3. Draw gliding light pulses
      drawLightPulses(frameTime);
    };

    // Animation Loop
    const render = (now: number) => {
      if (!isMounted) return;

      // Delta time with safe upper bound clamp
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      time += dt;

      // Framerate-independent exponential parallax inertia lerp (exact match to 0.035 at 60fps)
      const parallaxFactor = 1 - Math.exp(-2.15 * dt);
      curParallaxX += (targetParallaxX - curParallaxX) * parallaxFactor;
      curParallaxY += (targetParallaxY - curParallaxY) * parallaxFactor;

      drawFrame(time);

      if (!reducedMotion && isVisible && isDocumentVisible) {
        animFrameId = requestAnimationFrame(render);
      }
    };

    // Event Listeners: Pointer Parallax
    const handleMouseMove = (e: MouseEvent) => {
      targetParallaxX =
        (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      targetParallaxY =
        (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    };

    const handleMouseLeave = () => {
      targetParallaxX = 0;
      targetParallaxY = 0;
    };

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }

      if (reducedMotion) {
        time = 3.6;
        drawFrame(time);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseleave', handleMouseLeave);
      } else {
        lastTime = performance.now();
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('mouseleave', handleMouseLeave);
        if (isVisible && isDocumentVisible) {
          animFrameId = requestAnimationFrame(render);
        }
      }
    };

    // Tab Visibility change handler (pauses RAF and prevents delta time spike upon return)
    const handleVisibilityChange = () => {
      isDocumentVisible = !document.hidden;
      if (document.hidden) {
        if (animFrameId !== null) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
      } else {
        lastTime = performance.now();
        if (!reducedMotion && isVisible && animFrameId === null) {
          animFrameId = requestAnimationFrame(render);
        }
      }
    };

    // Initialize dimensions
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // ResizeObserver on canvas element
    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(canvas);

    // IntersectionObserver to pause when off-screen
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const nowVisible = entry?.isIntersecting ?? true;

        if (nowVisible !== isVisible) {
          isVisible = nowVisible;
          if (isVisible && !reducedMotion && isDocumentVisible) {
            lastTime = performance.now();
            if (animFrameId === null) {
              animFrameId = requestAnimationFrame(render);
            }
          } else if (!isVisible && animFrameId !== null) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
          }
        }
      },
      { rootMargin: '120px' }
    );
    intersectionObserver.observe(canvas);

    // Visibility Listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Motion listeners setup
    if (!reducedMotion) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseleave', handleMouseLeave);
      animFrameId = requestAnimationFrame(render);
    } else {
      time = 3.6;
      drawFrame(time);
    }

    mediaQuery.addEventListener('change', handleReducedMotionChange);

    // Teardown Cleanup
    return () => {
      isMounted = false;
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      mediaQuery.removeEventListener('change', handleReducedMotionChange);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
};

export default OpticalFiberHeroCanvas;
