import { type Transition, type Variants } from 'motion/react';
import * as THREE from 'three';

/**
 * Chakriva Design Intelligence — Unified Motion System
 * Curated curves and timings inspired by Raycast, Lusion, and Framer.
 */

// ── CANONICAL EASING CURVES ──────────────────────────────────────────
// Crisp editorial deceleration curve (Apple / Raycast / Lusion standard)
export const EASE_DECEL: [number, number, number, number] = [0.16, 1, 0.3, 1];
// Smooth bidirectional ease
export const EASE_SMOOTH: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
// Spring physics preset for interactive controls
export const SPRING_TACTILE = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 30,
};

// ── DURATION SCALE ───────────────────────────────────────────────────
export const DURATION = {
  instant: 0.1,
  fast: 0.18,
  base: 0.28,
  cinematic: 0.55,
  atmospheric: 0.85,
} as const;

// ── COMMON TRANSITIONS ───────────────────────────────────────────────
export const transitionDecel: Transition = {
  duration: DURATION.cinematic,
  ease: EASE_DECEL,
};

export const transitionFast: Transition = {
  duration: DURATION.fast,
  ease: EASE_DECEL,
};

// ── REUSABLE MOTION VARIANTS ─────────────────────────────────────────
export const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionDecel,
  },
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.base, ease: EASE_SMOOTH },
  },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

// ── BUTTON INTERACTION TOKENS ────────────────────────────────────────
export const buttonInteraction = {
  hover: { scale: 1.015 },
  tap: { scale: 0.985 },
  transition: { duration: DURATION.fast, ease: EASE_DECEL },
};

// ── THREE.JS RESOURCE DISPOSAL LIFECYCLE HELPER ──────────────────────
/**
 * Safely disposes of all geometries, materials, textures, and renderer
 * attached to a Three.js scene to prevent WebGL memory leaks.
 */
export function disposeThreeScene(
  renderer?: THREE.WebGLRenderer | null,
  scene?: THREE.Scene | null,
  geometries?: THREE.BufferGeometry[],
  materials?: THREE.Material[]
): void {
  if (geometries) {
    geometries.forEach((g) => {
      try {
        g.dispose();
      } catch {
        // Safe no-op on already disposed geometry
      }
    });
  }

  if (materials) {
    materials.forEach((m) => {
      try {
        m.dispose();
      } catch {
        // Safe no-op on already disposed material
      }
    });
  }

  if (scene) {
    scene.traverse((object) => {
      if ((object as THREE.Mesh).geometry) {
        try {
          (object as THREE.Mesh).geometry.dispose();
        } catch {
          // ignore
        }
      }
      if ((object as THREE.Mesh).material) {
        const mat = (object as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            try {
              m.dispose();
            } catch {
              // ignore
            }
          });
        } else {
          try {
            mat.dispose();
          } catch {
            // ignore
          }
        }
      }
    });
  }

  if (renderer) {
    try {
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    } catch {
      // Safe no-op
    }
  }
}
