declare module 'liquid-gl' {
  export interface LiquidGLCallbacks {
    init?: (instance: LiquidGLLens) => void;
    dragstart?: (instance: LiquidGLLens, info: { clientX: number; clientY: number }) => void;
    drag?: (instance: LiquidGLLens, info: { clientX: number; clientY: number; x: number; y: number }) => void;
    dragend?: (instance: LiquidGLLens, info: { clientX?: number; clientY?: number; x: number; y: number }) => void;
  }

  export interface LiquidGLOptions {
    /** CSS selector for the target element(s) to glassify (e.g. '.liquidGL') */
    target: string;
    /** Area used for refraction snapshot, defaults to 'body' */
    snapshot?: string;
    /** Renderer chain: 'auto' | 'webgpu' | 'webgl2' | 'webgl' */
    engine?: 'auto' | 'webgpu' | 'webgl2' | 'webgl';
    /** Quality / resolution scale of snapshot (0.1 to 3.0), default 2.0 */
    resolution?: number;
    /** Explicit stacking order for the lens canvas */
    zIndex?: number;
    /** Sub-element selector for lens content, or false to disable content layer */
    content?: string | boolean;
    /** Base refraction strength (0 to 1), default 0.01 */
    refraction?: number;
    /** Chromatic aberration strength (0 to 1), 0 = off */
    aberration?: number;
    /** Intensity of the edge bevel (0 to 1), default 0.08 */
    bevelDepth?: number;
    /** Width of the bevel as proportion of element (0 to 1), default 0.15 */
    bevelWidth?: number;
    /** Blur radius in px for frosted look, default 0 (clear) */
    frost?: number;
    /** Toggles soft drop-shadow under the pane, default true */
    shadow?: boolean;
    /** Animated specular light highlights, default true */
    specular?: boolean;
    /** Reveal animation mode: 'fade' | 'none', default 'fade' */
    reveal?: 'fade' | 'none';
    /** Enables 3D tilt on hover, default false */
    tilt?: boolean;
    /** Degrees of tilt (0 to 25), default 5 */
    tiltFactor?: number;
    /** Duration in ms for tilt easing, default 400 */
    tiltEase?: number;
    /** Whether lens can be picked up and dragged, default false */
    draggable?: boolean;
    /** Pointer interaction mode: 'none' | 'fluid' */
    interaction?: 'none' | 'fluid';
    /** Strength of fluid displacement (0 to 1), default 0.5 */
    interactionStrength?: number;
    /** Radius of fluid interaction (0 to 1), default 0.35 */
    interactionRadius?: number;
    /** Viscosity of fluid settling (0 to 1), default 0.65 */
    interactionViscosity?: number;
    /** Magnification factor (0.001 to 3.0), default 1 */
    magnify?: number;
    /** CSS color string for tinted dye, e.g. 'rgba(8, 10, 20, 0.25)' */
    tint?: string | null;
    /** Debug helper GUI flag */
    helper?: boolean;
    /** Lifecycle and event callbacks */
    on?: LiquidGLCallbacks;
  }

  export interface LiquidGLLens {
    /** Target DOM element */
    el: HTMLElement;
    /** Active options */
    options: LiquidGLOptions;
    /** Tear down lens, remove listeners, restore styles, and release GPU resources */
    destroy(): void;
    /** Dynamically change tint color */
    setTint(color: string | null): unknown;
    /** Toggle draggable behavior */
    setDraggable(enabled: boolean): void;
    /** Toggle tilt behavior */
    setTilt(enabled: boolean): void;
    /** Toggle shadow */
    setShadow(enabled: boolean): void;
    /** Force recalculation of element metrics */
    updateMetrics(): void;
    /** Clear drag offset */
    clearDrag(): void;
    [key: string]: unknown;
  }

  export interface LiquidGLSyncConfig {
    gsap?: unknown;
    ScrollTrigger?: unknown;
    lenis?: unknown;
    locomotiveScroll?: unknown;
  }

  export interface LiquidGLFunction {
    (options: LiquidGLOptions): LiquidGLLens | LiquidGLLens[] | undefined;
    registerDynamic(elements: string | Element | Element[] | NodeList): void;
    syncWith(config?: LiquidGLSyncConfig): { lenis?: unknown; locomotiveScroll?: unknown };
  }

  const liquidGL: LiquidGLFunction;
  export default liquidGL;
}
