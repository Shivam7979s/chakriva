/**
 * CHAKRIVA — Optical-Fiber Pure Mathematical Engine & Constants
 * 
 * Extracted pure mathematical functions, trajectory curves, and bundle configurations
 * from the original Stitch optical-fiber simulation.
 * 
 * 100% preservation of all equations, harmonics, octaves, dispersion exponents,
 * parallax constants, and color definitions.
 * 
 * Reference: `reference/stitch-landing-page/optical_fiber_engine.js`
 */

import type {
  HeroFiberBundleConfig,
  HeroMicroTrailConfig,
  HeroLightPulseDef,
  HeroLightPulseInstance,
  LearningLoopStrandConfig,
} from './types';

// ============================================================================
// SECTION 01 — HERO OPTICAL FIBER BUNDLE CONFIGURATIONS
// ============================================================================

/**
 * 4 Distinct Depth Tiers of Optical Fiber Bundles (370 total hairline strands):
 * - Tier 1: Deep Background Graphite & Charcoal (110 strands)
 * - Tier 2: Midground Volumetric Steel-Blue & Icy-Silver (130 strands)
 * - Tier 3: Focal Luminous River Hairlines (85 strands)
 * - Tier 4: Selective Foreground Highlights (45 strands)
 */
export const HERO_FIBER_BUNDLES: readonly HeroFiberBundleConfig[] = [
  {
    id: 'bg-graphite',
    strands: 110,
    spread: 160,
    yBase: 0.71,
    freq1: 1.25,
    freq2: 2.1,
    amp1: 95,
    amp2: 42,
    speed: 0.18,
    phase: 0.2,
    rgb: '148, 163, 184',
    alphaMin: 0.08,
    alphaMax: 0.22,
    minWidth: 0.4,
    maxWidth: 0.7,
    pFactor: 0.3,
    asymmetry: 1.15,
  },
  {
    id: 'mid-steelblue',
    strands: 130,
    spread: 130,
    yBase: 0.67,
    freq1: 1.75,
    freq2: 1.35,
    amp1: 120,
    amp2: 48,
    speed: -0.22,
    phase: 1.8,
    rgb: '186, 230, 253',
    alphaMin: 0.20,
    alphaMax: 0.45,
    minWidth: 0.5,
    maxWidth: 0.95,
    pFactor: 0.6,
    asymmetry: 0.92,
  },
  {
    id: 'focal-silver',
    strands: 85,
    spread: 80,
    yBase: 0.635,
    freq1: 1.6,
    freq2: 2.7,
    amp1: 135,
    amp2: 38,
    speed: 0.28,
    phase: 0.85,
    rgb: '248, 250, 252',
    alphaMin: 0.45,
    alphaMax: 0.78,
    minWidth: 0.65,
    maxWidth: 1.1,
    pFactor: 0.95,
    asymmetry: 1.05,
  },
  {
    id: 'fg-highlights',
    strands: 45,
    spread: 36,
    yBase: 0.63,
    freq1: 1.6,
    freq2: 2.7,
    amp1: 132,
    amp2: 36,
    speed: 0.28,
    phase: 0.85,
    rgb: '255, 255, 255',
    alphaMin: 0.75,
    alphaMax: 0.95,
    minWidth: 0.9,
    maxWidth: 1.45,
    pFactor: 1.15,
    asymmetry: 1.0,
  },
] as const;

/**
 * Hairline dotted micro-trails tracing alongside continuous ribbons.
 */
export const HERO_MICRO_TRAILS: readonly HeroMicroTrailConfig[] = [
  { count: 120, speed: 0.042, bundleIdx: 1, offset: -12, dotRadius: 0.9, rgb: '186, 230, 253', maxAlpha: 0.45 },
  { count: 95, speed: -0.035, bundleIdx: 0, offset: 16, dotRadius: 0.8, rgb: '148, 163, 184', maxAlpha: 0.35 },
  { count: 80, speed: 0.052, bundleIdx: 2, offset: -5, dotRadius: 1.1, rgb: '248, 250, 252', maxAlpha: 0.65 },
] as const;

/**
 * Pure traveling light pulse descriptors gliding on hairlines with exponential falloff.
 */
export const HERO_LIGHT_PULSE_DEFS: readonly HeroLightPulseDef[] = [
  {
    bundleIdx: 2,
    offset: -1,
    length: 150,
    rgb: '255, 255, 255',
    peakAlpha: 0.9,
    calcProgress: (curT: number) => (curT * 0.075) % 1,
  },
  {
    bundleIdx: 1,
    offset: 4,
    length: 130,
    rgb: '186, 230, 253',
    peakAlpha: 0.7,
    calcProgress: (curT: number) => 1 - ((curT * 0.06) % 1),
  },
  {
    bundleIdx: 3,
    offset: 0,
    length: 160,
    rgb: '255, 255, 255',
    peakAlpha: 0.95,
    calcProgress: (curT: number) => ((curT * 0.082) + 0.52) % 1,
  },
] as const;

// ============================================================================
// HERO MATHEMATICAL FORMULAS
// ============================================================================

/**
 * Multi-octave continuous harmonic deformation equation for Hero optical fibers.
 * 
 * @param t Normalized horizontal position along ribbon (0..1)
 * @param bundle Bundle depth configuration
 * @param curT Global simulation clock in seconds
 * @param px Parallax horizontal offset
 * @param py Parallax vertical offset
 * @param strandRatio Normalized strand index (0..1) within bundle
 * @param height Current canvas rendering height
 * @returns Vertical y coordinate in canvas space
 */
export function getFiberY(
  t: number,
  bundle: HeroFiberBundleConfig,
  curT: number,
  _px: number,
  py: number,
  strandRatio: number,
  height: number
): number {
  // Natural overarching swoop: descends gently below hero text, crests dynamically
  const arch = Math.sin(t * Math.PI) * -90;
  const harmonicAsym = Math.sin(t * 2.1 + bundle.phase) * (16 * bundle.asymmetry);

  // Micro strand phase offsets prevent uniform movement (natural twisting)
  const strandPhase = strandRatio * 0.35;
  const microDrift = Math.sin(curT * 0.45 + strandRatio * 6.28) * 8.0;

  const octave1 = Math.sin(t * Math.PI * bundle.freq1 + curT * bundle.speed + bundle.phase + strandPhase) * bundle.amp1;
  const octave2 = Math.cos(t * Math.PI * bundle.freq2 - curT * (bundle.speed * 0.7) + bundle.phase) * bundle.amp2;
  const octave3 = Math.sin(t * Math.PI * 3.4 + curT * (bundle.speed * 1.2)) * 10;

  return height * bundle.yBase + arch + harmonicAsym + octave1 + octave2 + octave3 + microDrift + py;
}

/**
 * Calculates non-linear strand lateral dispersion offset.
 * Creates dense filament core and delicate fraying fringes.
 * 
 * @param normS Normalized strand index (0..1)
 * @param spread Bundle spread in pixels
 */
export function calcShapedOffset(normS: number, spread: number): number {
  const centered = (normS - 0.5) * 2;
  return Math.sign(centered) * Math.pow(Math.abs(centered), 1.25) * (spread * 0.5);
}

/**
 * Calculates strand opacity and stroke width based on bundle depth and core density weight.
 * Core filaments have higher optical density; outer fibers taper cleanly.
 * 
 * @param normS Normalized strand index (0..1)
 * @param bundle Bundle tier configuration
 */
export function calcStrandMetrics(
  normS: number,
  bundle: HeroFiberBundleConfig
): { strandAlpha: number; strandWidth: number } {
  const densityWeight = Math.sin(normS * Math.PI);
  const strandAlpha = bundle.alphaMin + (bundle.alphaMax - bundle.alphaMin) * Math.pow(densityWeight, 1.2);
  const strandWidth = bundle.minWidth + (bundle.maxWidth - bundle.minWidth) * Math.pow(densityWeight, 1.1);
  return { strandAlpha, strandWidth };
}

/**
 * Dynamic breathing envelope allowing fibers to bunch tightly at nodes and breathe apart at wings.
 * 
 * @param t Normalized horizontal position along ribbon (0..1)
 * @param curT Global simulation clock in seconds
 */
export function calcBreathingEnvelope(t: number, curT: number): number {
  return 0.65 + Math.sin(t * Math.PI) * 0.6 + Math.sin(curT * 0.3 + t * 3.0) * 0.15;
}

/**
 * Evaluates active light pulse instances for the current simulation timestamp.
 */
export function evaluateLightPulses(curT: number): HeroLightPulseInstance[] {
  return HERO_LIGHT_PULSE_DEFS.map((def) => ({
    progress: def.calcProgress(curT),
    bundleIdx: def.bundleIdx,
    offset: def.offset,
    length: def.length,
    rgb: def.rgb,
    peakAlpha: def.peakAlpha,
  }));
}

// ============================================================================
// SECTION 02 — THE LEARNING LOOP OPTICAL FIBERS
// ============================================================================

export const LEARNING_LOOP_STRAND_COUNT = 22;

/**
 * Generates the deterministic 22-strand optical fiber array for Section 02.
 * Fine silver-white and icy-steel-blue optical fiber strands.
 */
export function generateLearningLoopStrands(count: number = LEARNING_LOOP_STRAND_COUNT): LearningLoopStrandConfig[] {
  const strands: LearningLoopStrandConfig[] = [];
  for (let i = 0; i < count; i++) {
    const norm = count > 1 ? i / (count - 1) : 0.5;
    const isBlue = i % 3 === 1;
    const isPureWhite = i % 4 === 0;
    strands.push({
      ratio: norm,
      lateralOffset: (norm - 0.5) * 52, // Tight coherent bundle width
      verticalOffset: (norm - 0.5) * 28,
      width: 0.45 + Math.sin(norm * Math.PI) * 0.65,
      alphaBase: 0.18 + Math.sin(norm * Math.PI) * 0.28,
      rgb: isPureWhite ? '248, 250, 252' : isBlue ? '186, 230, 253' : '203, 213, 225',
      freq: 0.95 + (i % 4) * 0.25,
      phase: i * 0.28,
    });
  }
  return strands;
}

/**
 * Pre-instantiated constant set of the 22 Learning Loop strands.
 */
export const LEARNING_LOOP_STRANDS: readonly LearningLoopStrandConfig[] = Object.freeze(
  generateLearningLoopStrands(LEARNING_LOOP_STRAND_COUNT)
);

/**
 * Evaluates the (x, y) coordinates of a strand point in Section 02.
 * 
 * Trajectory Path:
 * Emerges at top right-center (smooth downward continuation of hero's lower right wave sweep),
 * glides down the right flank keeping the text and cards in clean negative space,
 * curves gracefully under the bottom/lower edge of the 3 cards (y ~ 0.88 - 0.94),
 * and gently tapers out into the obsidian void before Section 03.
 * 
 * @param t Normalized progression along strand curve (0 = top, 1 = bottom)
 * @param strand Strand configuration
 * @param width Viewport / container width in CSS pixels
 * @param height Container height in CSS pixels
 * @param time Global simulation clock in seconds
 * @param curScrollProgress Lerped scroll progress (0..1)
 * @param reducedMotion Whether reduced motion is active
 */
export function calcLearningLoopPoint(
  t: number,
  strand: LearningLoopStrandConfig,
  width: number,
  height: number,
  time: number,
  curScrollProgress: number,
  reducedMotion: boolean
): { x: number; y: number } {
  const scrollDrift = (curScrollProgress - 0.5) * 36;
  const waveMotion = reducedMotion ? 0 : Math.sin(time * 0.45) * 12;

  // Organic curve coordinates:
  // t = 0.0: x = 0.76 (emerging right-of-center), y = 0
  // t = 0.45: x = 0.92 (sweeps along the right flank outside text/cards)
  // t = 0.82: x = 0.58 (curves under the bottom of cards toward center-left)
  // t = 1.0: x = 0.42 (tapers out smoothly)
  const sweepX = width * (0.76 + Math.sin(t * Math.PI * 0.85) * 0.18 - Math.pow(t, 2.2) * 0.52);
  const lateralHarmonic = Math.sin(t * Math.PI * strand.freq + strand.phase + (reducedMotion ? 0 : time * 0.2)) * (10 + strand.ratio * 8);

  // Variable envelope for bundle dispersion
  const dispersionEnvelope = Math.sin(t * Math.PI * 0.95);
  const x = sweepX + strand.lateralOffset * dispersionEnvelope + lateralHarmonic;

  // Natural vertical curve with gentle undulation and scroll responsiveness
  const baseUnderpass = Math.sin(t * Math.PI) * 18;
  const y = t * height + strand.verticalOffset * dispersionEnvelope + baseUnderpass + (scrollDrift * (1 - t * 0.5)) + (waveMotion * Math.sin(t * Math.PI));

  return { x, y };
}

/**
 * Calculates normalized scroll progress through Section 02 container.
 */
export function calcLearningLoopScrollProgress(
  rectTop: number,
  rectHeight: number,
  windowHeight: number
): number {
  const totalDist = windowHeight + rectHeight;
  const progress = (windowHeight - rectTop) / totalDist;
  return Math.max(0, Math.min(1, progress));
}
