import { useEffect, useRef, useState, useCallback } from 'react';
import liquidGL, { type LiquidGLOptions, type LiquidGLLens } from 'liquid-gl';

export interface UseLiquidGlassOptions extends Omit<LiquidGLOptions, 'target'> {
  /**
   * Explicit CSS selector for the target element to glassify.
   * e.g., '#chakriva-landing-navbar' or '.liquid-nav-glass'
   */
  target?: string;
  /**
   * Whether the effect is enabled. Defaults to true.
   */
  enabled?: boolean;
}

export interface UseLiquidGlassReturn {
  /** Reference to the underlying active LiquidGL lens instance */
  lensRef: React.MutableRefObject<LiquidGLLens | null>;
  /** Whether the lens has been successfully initialized */
  isInitialized: boolean;
  /** Manually trigger re-initialization (e.g., after substantial DOM layout change) */
  reinitialize: () => void;
}

/**
 * useLiquidGlass — React hook for integrating liquidGL WebGPU/WebGL liquid glass refraction.
 *
 * Handles:
 * - Proper DOM layout timing via requestAnimationFrame
 * - Prevention of duplicate initialization across React 18 Strict Mode and re-renders
 * - Lifecycle cleanup on unmount via lens.destroy()
 * - Dynamic runtime tint updates when themes change
 * - Preserves native CSS backdrop-blur/design-system fallback
 */
export function useLiquidGlass(options: UseLiquidGlassOptions): UseLiquidGlassReturn {
  const {
    target = '.liquid-nav-glass',
    enabled = true,
    tint = null,
    snapshot = 'body',
    engine = 'auto',
    resolution = 2.0,
    zIndex,
    content,
    refraction = 0.012,
    aberration = 0.015,
    bevelDepth = 0.07,
    bevelWidth = 0.16,
    frost = 1.0,
    shadow = true,
    specular = true,
    reveal = 'fade',
    tilt = false,
    tiltFactor = 5,
    tiltEase = 400,
    draggable = false,
    interaction = 'none',
    interactionStrength = 0.5,
    interactionRadius = 0.35,
    interactionViscosity = 0.65,
    magnify = 1,
    on,
  } = options;

  const lensRef = useRef<LiquidGLLens | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializingRef = useRef(false);

  // Track the current tint for runtime updates
  const currentTintRef = useRef(tint);
  useEffect(() => {
    currentTintRef.current = tint;
    if (lensRef.current && typeof lensRef.current.setTint === 'function') {
      try {
        lensRef.current.setTint(tint);
      } catch (err) {
        console.warn('[useLiquidGlass] Failed to update tint dynamically:', err);
      }
    }
  }, [tint]);

  const cleanupLens = useCallback(() => {
    if (lensRef.current) {
      try {
        lensRef.current.destroy();
      } catch (err) {
        console.warn('[useLiquidGlass] Error during lens.destroy():', err);
      }
      lensRef.current = null;
    }

    if (typeof document !== 'undefined') {
      const el = document.querySelector(target);
      if (el) {
        el.removeAttribute('data-liquidgl-initialized');
      }
    }

    isInitializingRef.current = false;
    setIsInitialized(false);
  }, [target]);

  const initLens = useCallback(() => {
    if (
      !enabled ||
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      typeof liquidGL !== 'function'
    ) {
      return;
    }

    // Prevent duplicate concurrent initialization
    if (lensRef.current || isInitializingRef.current) {
      return;
    }

    const targetEl = document.querySelector(target) as HTMLElement | null;
    if (!targetEl) {
      return;
    }

    // Check if element is already marked as initialized
    if (targetEl.getAttribute('data-liquidgl-initialized') === 'true') {
      return;
    }

    isInitializingRef.current = true;

    try {
      const config: LiquidGLOptions = {
        target,
        snapshot,
        engine,
        resolution,
        refraction,
        aberration,
        bevelDepth,
        bevelWidth,
        frost,
        shadow,
        specular,
        reveal,
        tilt,
        tiltFactor,
        tiltEase,
        draggable,
        interaction,
        interactionStrength,
        interactionRadius,
        interactionViscosity,
        magnify,
        tint: currentTintRef.current,
        zIndex,
        content,
        on: {
          ...on,
          init: (instance) => {
            setIsInitialized(true);
            isInitializingRef.current = false;
            if (on?.init) on.init(instance);
          },
        },
      };

      const result = liquidGL(config);

      if (!result) {
        isInitializingRef.current = false;
        return;
      }

      const activeLens = Array.isArray(result) ? result[0] : result;
      if (activeLens) {
        lensRef.current = activeLens;
        targetEl.setAttribute('data-liquidgl-initialized', 'true');
        setIsInitialized(true);
      }
    } catch (err) {
      console.warn('[useLiquidGlass] Failed to initialize liquidGL:', err);
      cleanupLens();
    } finally {
      isInitializingRef.current = false;
    }
  }, [
    target,
    enabled,
    snapshot,
    engine,
    resolution,
    refraction,
    aberration,
    bevelDepth,
    bevelWidth,
    frost,
    shadow,
    specular,
    reveal,
    tilt,
    tiltFactor,
    tiltEase,
    draggable,
    interaction,
    interactionStrength,
    interactionRadius,
    interactionViscosity,
    magnify,
    zIndex,
    content,
    on,
    cleanupLens,
  ]);

  const reinitialize = useCallback(() => {
    cleanupLens();
    requestAnimationFrame(() => {
      initLens();
    });
  }, [cleanupLens, initLens]);

  useEffect(() => {
    let active = true;
    let rafId: number | null = null;

    if (!enabled) {
      cleanupLens();
      return;
    }

    // Use requestAnimationFrame so React has completed DOM layout & styles
    rafId = requestAnimationFrame(() => {
      if (!active) return;
      initLens();
    });

    return () => {
      active = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      cleanupLens();
    };
  }, [enabled, initLens, cleanupLens]);

  return {
    lensRef,
    isInitialized,
    reinitialize,
  };
}

export default useLiquidGlass;
