/**
 * CHAKRIVA — Optical-Fiber Engine Types
 * 
 * Strict TypeScript interfaces representing the original Stitch optical-fiber bundle
 * simulation parameters, rendering models, and lifecycle specifications.
 * 
 * Reference source: `reference/stitch-landing-page/optical_fiber_engine.js`
 */

/**
 * Configuration for a single depth tier in the Hero optical-fiber ribbon.
 * Over 350 hairline filaments are grouped across 4 depth tiers:
 * - Tier 1: 'bg-graphite' (110 strands)
 * - Tier 2: 'mid-steelblue' (130 strands)
 * - Tier 3: 'focal-silver' (85 strands)
 * - Tier 4: 'fg-highlights' (45 strands)
 */
export interface HeroFiberBundleConfig {
  /** Unique tier identifier */
  id: 'bg-graphite' | 'mid-steelblue' | 'focal-silver' | 'fg-highlights';
  /** Total count of hairline strands in bundle */
  strands: number;
  /** Bundle lateral spread factor in pixels */
  spread: number;
  /** Normalized vertical baseline anchor (0..1 of canvas height) */
  yBase: number;
  /** Primary wave frequency coefficient */
  freq1: number;
  /** Secondary harmonic frequency coefficient */
  freq2: number;
  /** Primary amplitude in pixels */
  amp1: number;
  /** Secondary harmonic amplitude in pixels */
  amp2: number;
  /** Horizontal animation travel speed */
  speed: number;
  /** Base phase offset in radians */
  phase: number;
  /** Core RGB color tuple string (e.g. '148, 163, 184') */
  rgb: string;
  /** Minimum strand opacity (outer periphery) */
  alphaMin: number;
  /** Maximum strand opacity (dense core) */
  alphaMax: number;
  /** Minimum stroke width in pixels */
  minWidth: number;
  /** Maximum stroke width in pixels */
  maxWidth: number;
  /** Mouse parallax attenuation factor */
  pFactor: number;
  /** Asymmetric harmonic warping multiplier */
  asymmetry: number;
}

/**
 * Configuration for hairline dotted micro-trails tracing alongside continuous ribbons.
 */
export interface HeroMicroTrailConfig {
  /** Dot count along the trail length */
  count: number;
  /** Relative travel speed */
  speed: number;
  /** Index of parent fiberBundle tier (0..3) */
  bundleIdx: number;
  /** Pixel vertical offset relative to bundle midline */
  offset: number;
  /** Dot radius in pixels */
  dotRadius: number;
  /** RGB color tuple string */
  rgb: string;
  /** Peak alpha at center of viewport */
  maxAlpha: number;
}

/**
 * Definition for pure gliding traveling light pulses along fiber hairlines.
 * Zero flares, zero starbursts, pure exponential fading tail streak.
 */
export interface HeroLightPulseDef {
  /** Index of parent fiberBundle tier (0..3) */
  bundleIdx: number;
  /** Pixel vertical offset relative to bundle midline */
  offset: number;
  /** Streak length along strand in pixels */
  length: number;
  /** RGB color tuple string */
  rgb: string;
  /** Peak alpha at pulse center */
  peakAlpha: number;
  /** Pure function calculating normalized position (0..1) at time t */
  calcProgress: (curT: number) => number;
}

/**
 * Runtime instance of a light pulse for a specific frame.
 */
export interface HeroLightPulseInstance {
  progress: number;
  bundleIdx: number;
  offset: number;
  length: number;
  rgb: string;
  peakAlpha: number;
}

/**
 * Configuration for an individual optical strand in Section 02 (The Learning Loop).
 */
export interface LearningLoopStrandConfig {
  /** Normalized index ratio (0..1) across strand bundle */
  ratio: number;
  /** Lateral dispersion offset from bundle centerline */
  lateralOffset: number;
  /** Vertical dispersion offset from bundle centerline */
  verticalOffset: number;
  /** Stroke width in pixels (0.45px - 1.1px) */
  width: number;
  /** Base opacity */
  alphaBase: number;
  /** RGB color tuple string */
  rgb: string;
  /** Wave oscillation frequency */
  freq: number;
  /** Wave oscillation phase offset */
  phase: number;
}

/**
 * Canvas dimension and DPI scaling state.
 */
export interface FiberCanvasDimensions {
  width: number;
  height: number;
  dpr: number;
}

/**
 * Multi-plane parallax inertia lerp state.
 */
export interface ParallaxState {
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
}

/**
 * Lifecycle and integration options for React fiber canvas hooks/components.
 */
export interface FiberEngineOptions {
  /** Override reduced motion detection */
  prefersReducedMotion?: boolean;
  /** Max device pixel ratio cap (default: 2) */
  maxDpr?: number;
  /** Pause rendering when off-screen via IntersectionObserver (default: true) */
  pauseOffscreen?: boolean;
}
