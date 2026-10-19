import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { disposeThreeScene } from '@/lib/motion';

interface ChakravyuhaHeroProps {
  className?: string;
}

/**
 * ChakravyuhaHero — Monolithic Ziggurat & Terraced Bastion with Integrated Fluid Energy
 * Sprint 04: Final Art Direction, Asymmetric Architectural Depth & Dynamic Lighting
 *
 * Implements:
 * - Monumental Engineered Architecture:
 *     - Multi-tiered basalt stepped plinths with recessed negative shadow reveals.
 *     - Asymmetric monolithic pylons, cantilevered titanium portal gateways.
 *     - Polished deep-obsidian sanctum monolith with vertical sapphire light channels.
 *     - Concentric architectural datum ring platform (replacing generic wireframe grid).
 * - Architecturally Integrated Fluid Spline:
 *     - Closed Catmull-Rom spline threading directly through portals and over cantilevers.
 *     - Traveling pulse spark carrying a dynamic point light that paints moving illumination on surfaces.
 *     - Secondary subdued sapphire harmonic trail.
 * - Disciplined Cinematic Lighting:
 *     - High-angle raking key light casting soft PCF directional shadows.
 *     - Grazing cyan rim light defining silhouette bevels against deep void.
 *     - Internal sanctum breathing glow and deep dark shadow wells.
 * - Defensive Performance & Clean Lifecycle:
 *     - Off-screen render suspension via IntersectionObserver.
 *     - prefers-reduced-motion high-resolution static rendering.
 *     - Complete GPU/WebGL resource disposal via disposeThreeScene.
 */
export const ChakravyuhaHero: React.FC<ChakravyuhaHeroProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // WebGL Context Check
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGlSupported(false);
        return;
      }
    } catch {
      setWebGlSupported(false);
      return;
    }

    let isVisible = true;
    let animationFrameId: number;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    // ── SCENE & ATMOSPHERIC FOG ─────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07090D, 0.024);

    let width = container.clientWidth || window.innerWidth || 1200;
    let height = container.clientHeight || window.innerHeight || 800;

    const isMobile = width < 768;

    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);

    // Viewport-calibrated camera positioning
    const getBaseCamPos = (w: number) => {
      if (w < 768) {
        // Mobile: centered high angle to frame the monument above the CTAs
        return new THREE.Vector3(-10.5, 9.8, 14.5);
      } else if (w < 1024) {
        // Tablet: balanced composition
        return new THREE.Vector3(-9.4, 7.8, 12.8);
      } else {
        // Desktop: cinematic 3/4 perspective emphasizing diagonal vanishing lines
        return new THREE.Vector3(-8.6, 6.4, 11.4);
      }
    };

    const baseCamPos = getBaseCamPos(width);
    camera.position.copy(baseCamPos);
    camera.lookAt(0.4, 1.4, 0);

    // ── RENDERER ───────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // ── DISCIPLINED LIGHTING HIERARCHY ─────────────────────────────
    // 1. High-Angle Raking Key Light
    const keyLight = new THREE.DirectionalLight(0xF8FAFC, 2.4);
    keyLight.position.set(-11, 15, 9);
    if (!isMobile) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.04;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 42;
      keyLight.shadow.camera.left = -11;
      keyLight.shadow.camera.right = 11;
      keyLight.shadow.camera.top = 11;
      keyLight.shadow.camera.bottom = -11;
    }
    scene.add(keyLight);

    // 2. Cool Grazing Cyan Rim Light (defines silhouette edges against void)
    const cyanRim = new THREE.DirectionalLight(0x38BDF8, 1.25);
    cyanRim.position.set(13, 6, -9);
    scene.add(cyanRim);

    // 3. Deep Ambient & Ground Fill (preserves rich dark shadow wells)
    const ambientLight = new THREE.AmbientLight(0x06090F, 0.8);
    scene.add(ambientLight);

    const softUnderFill = new THREE.DirectionalLight(0x0F172A, 0.35);
    softUnderFill.position.set(-4, -6, 7);
    scene.add(softUnderFill);

    // 4. Sanctum Internal Core Point Light
    const sanctumVoidLight = new THREE.PointLight(0x38BDF8, 1.6, 12);
    sanctumVoidLight.position.set(0.35, 3.1, 0);
    scene.add(sanctumVoidLight);

    // 5. Dynamic Moving Light on Fluid Spark (casts light onto terraces)
    const tracerDynamicLight = new THREE.PointLight(0x38BDF8, isMobile ? 1.0 : 1.8, 6.5);
    tracerDynamicLight.position.set(0.35, 3.1, 0);
    scene.add(tracerDynamicLight);

    // ── MATERIAL CRAFT ─────────────────────────────────────────────
    // Basalt: Deep, non-reflective volcanic stone foundation with micro-roughness
    const basaltMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0B0D14,
        roughness: 0.82,
        metalness: 0.16,
      })
    );

    // Machined Titanium: Dark satin metallic finish with specular definition
    const titaniumMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x141A26,
        roughness: 0.36,
        metalness: 0.76,
      })
    );

    // Muted Bronze: High-grade architectural trim on revealed joints & mullions
    const bronzeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x966116,
        roughness: 0.32,
        metalness: 0.88,
      })
    );

    // Obsidian Sanctum: Polished dark monolith with deep sapphire emissive vein
    const obsidianMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x030508,
        roughness: 0.12,
        metalness: 0.95,
        emissive: 0x0284C7,
        emissiveIntensity: 0.14,
      })
    );

    // Sanctum Structural Accent Cage
    const cageMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x38BDF8,
        wireframe: true,
        transparent: true,
        opacity: 0.15,
      })
    );

    // ── ARCHITECTURAL FORMATION (ASYMMETRIC MONOLITHIC BASTION) ────
    const formation = new THREE.Group();
    scene.add(formation);

    const addBox = (
      parent: THREE.Group,
      geo: THREE.BoxGeometry,
      mat: THREE.Material,
      pos: [number, number, number],
      rot?: [number, number, number]
    ) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      if (rot) mesh.rotation.set(...rot);
      mesh.castShadow = !isMobile;
      mesh.receiveShadow = !isMobile;
      parent.add(mesh);
      return mesh;
    };

    // Tier 0: Ground Foundation Plinths with Stepped Negative Reveals
    const tier0 = new THREE.Group();
    formation.add(tier0);
    // Base foundation slab
    addBox(tier0, trackGeo(new THREE.BoxGeometry(11.4, 0.38, 9.6)), basaltMat, [0.5, 0.19, 0]);
    // Recessed shadow reveal groove (thin dark inset)
    addBox(tier0, trackGeo(new THREE.BoxGeometry(10.8, 0.08, 9.0)), basaltMat, [0.5, 0.42, 0]);
    // Stepped sub-terrace plinth
    addBox(tier0, trackGeo(new THREE.BoxGeometry(7.6, 0.52, 11.6)), basaltMat, [-1.4, 0.26, 0.6]);
    // Bronze architectural seam inlay
    addBox(tier0, trackGeo(new THREE.BoxGeometry(11.5, 0.03, 0.08)), bronzeMat, [0.5, 0.40, 4.82]);
    addBox(tier0, trackGeo(new THREE.BoxGeometry(0.08, 0.03, 9.7)), bronzeMat, [6.22, 0.40, 0]);

    // Tier 1: Intermediate Bastion Blocks & Overhanging Cantilevers
    const tier1 = new THREE.Group();
    formation.add(tier1);
    // Main intermediate podium
    addBox(tier1, trackGeo(new THREE.BoxGeometry(7.4, 0.82, 6.4)), titaniumMat, [0.3, 0.89, -0.2]);
    // Asymmetric forward terrace extension
    addBox(tier1, trackGeo(new THREE.BoxGeometry(4.6, 1.12, 4.4)), basaltMat, [-2.2, 1.04, 1.8]);
    // Right-wing cantilevered terrace platform
    addBox(tier1, trackGeo(new THREE.BoxGeometry(8.6, 0.30, 1.6)), titaniumMat, [1.4, 0.80, 2.9]);
    // Bronze highlight strip along cantilever lip
    addBox(tier1, trackGeo(new THREE.BoxGeometry(8.64, 0.03, 0.06)), bronzeMat, [1.4, 0.96, 3.72]);

    // Tier 2: Monolithic Vertical Pylons & Portals (Creating Asymmetry & Scale)
    const tier2 = new THREE.Group();
    formation.add(tier2);
    // Elevated podium
    addBox(tier2, trackGeo(new THREE.BoxGeometry(4.9, 1.32, 4.2)), titaniumMat, [0.4, 2.02, -0.3]);
    // Rear monolith pillar rising high on the back-left
    addBox(tier2, trackGeo(new THREE.BoxGeometry(1.4, 4.2, 1.4)), basaltMat, [-2.8, 2.55, -1.8]);
    // Bronze vertical reveal along rear pillar
    addBox(tier2, trackGeo(new THREE.BoxGeometry(0.06, 4.0, 0.06)), bronzeMat, [-2.08, 2.55, -1.08]);
    // Right-flank portal column
    addBox(tier2, trackGeo(new THREE.BoxGeometry(1.2, 3.0, 1.2)), basaltMat, [3.4, 1.95, 1.2]);
    // Forward cantilever walkway bridge
    addBox(tier2, trackGeo(new THREE.BoxGeometry(5.2, 0.24, 1.1)), titaniumMat, [-0.4, 2.42, 1.8]);

    // Tier 3: Machined Sanctum Core (Deep Polished Obsidian Monolith)
    const tier3 = new THREE.Group();
    formation.add(tier3);
    const altar = addBox(tier3, trackGeo(new THREE.BoxGeometry(2.35, 1.8, 2.35)), obsidianMat, [0.35, 3.48, 0]);
    // Vertical light channel inlays on the altar faces
    addBox(tier3, trackGeo(new THREE.BoxGeometry(0.12, 1.7, 0.04)), bronzeMat, [0.35, 3.48, 1.19]);
    addBox(tier3, trackGeo(new THREE.BoxGeometry(0.04, 1.7, 0.12)), bronzeMat, [1.53, 3.48, 0]);
    // Quiet wireframe cage enclosing the sanctum perimeter
    addBox(tier3, trackGeo(new THREE.BoxGeometry(2.46, 1.9, 2.46)), cageMat, [0.35, 3.48, 0]);
    // Bronze corner mullions defining core edges
    addBox(tier3, trackGeo(new THREE.BoxGeometry(0.06, 2.15, 0.06)), bronzeMat, [-0.90, 3.48, -0.94]);
    addBox(tier3, trackGeo(new THREE.BoxGeometry(0.06, 2.15, 0.06)), bronzeMat, [1.60, 3.48, -0.94]);
    addBox(tier3, trackGeo(new THREE.BoxGeometry(0.06, 2.15, 0.06)), bronzeMat, [-0.90, 3.48, 1.24]);
    addBox(tier3, trackGeo(new THREE.BoxGeometry(0.06, 2.15, 0.06)), bronzeMat, [1.60, 3.48, 1.24]);

    // Tier 4: Floating Overhead Lintels & Architraves
    const tier4 = new THREE.Group();
    formation.add(tier4);
    addBox(tier4, trackGeo(new THREE.BoxGeometry(3.6, 0.22, 0.75)), titaniumMat, [0.8, 4.65, 0.4]);
    addBox(tier4, trackGeo(new THREE.BoxGeometry(0.75, 0.22, 3.2)), titaniumMat, [-1.18, 4.38, -0.75]);

    // Architectural Datum Foundation Rings (Replacing generic wireframe grid)
    const datumGroup = new THREE.Group();
    formation.add(datumGroup);
    const ringRadii = [4.8, 7.2, 9.6, 12.0];
    ringRadii.forEach((rad) => {
      const ringGeo = trackGeo(new THREE.RingGeometry(rad, rad + 0.03, 64));
      const ringMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0x0284C7,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
        })
      );
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.01;
      datumGroup.add(ringMesh);
    });

    // ── ARCHITECTURAL FLUID LIGHT SPLINE (ORGANIC INTEGRATED PATH) ───
    // Smooth Catmull-Rom spline threading directly through portals and cantilevers
    const splinePoints = [
      new THREE.Vector3(3.2, 0.8, 2.8),
      new THREE.Vector3(1.8, 1.7, 2.4),
      new THREE.Vector3(0.4, 2.6, 1.4),
      new THREE.Vector3(-0.8, 3.5, 0.2),
      new THREE.Vector3(-0.2, 4.2, -0.8),
      new THREE.Vector3(1.4, 4.5, -0.4),
      new THREE.Vector3(2.2, 3.6, 0.6),
      new THREE.Vector3(1.6, 2.4, 2.2),
      new THREE.Vector3(-0.6, 1.4, 2.8),
      new THREE.Vector3(-2.2, 1.8, 1.2),
      new THREE.Vector3(-1.8, 2.8, -0.8),
      new THREE.Vector3(0.6, 3.8, -0.2),
      new THREE.Vector3(2.4, 2.8, 1.6),
    ];
    const fluidCurve = new THREE.CatmullRomCurve3(splinePoints, true, 'catmullrom', 0.2);

    const SPLINE_SEGS = 120;
    const ribbonPoints = fluidCurve.getPoints(SPLINE_SEGS);
    const ribbonPositions = new Float32Array((SPLINE_SEGS + 1) * 3);

    for (let i = 0; i <= SPLINE_SEGS; i++) {
      const pt = ribbonPoints[i % ribbonPoints.length];
      ribbonPositions[i * 3 + 0] = pt.x;
      ribbonPositions[i * 3 + 1] = pt.y;
      ribbonPositions[i * 3 + 2] = pt.z;
    }

    // 1. Primary Cyan Fluid Filament
    const primaryGeo = trackGeo(new THREE.BufferGeometry());
    primaryGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPositions, 3));
    const primaryMat = trackMat(
      new THREE.LineBasicMaterial({
        color: 0x38BDF8,
        transparent: true,
        opacity: 0.65,
        linewidth: 1.5,
      })
    );
    const primaryLine = new THREE.Line(primaryGeo, primaryMat);
    formation.add(primaryLine);

    // 2. Secondary Subdued Sapphire Harmonic Filament
    const secondaryPositions = new Float32Array((SPLINE_SEGS + 1) * 3);
    for (let i = 0; i <= SPLINE_SEGS; i++) {
      const pt = ribbonPoints[i % ribbonPoints.length];
      secondaryPositions[i * 3 + 0] = pt.x * 1.12;
      secondaryPositions[i * 3 + 1] = pt.y * 0.95 + 0.15;
      secondaryPositions[i * 3 + 2] = pt.z * 1.12;
    }
    const secondaryGeo = trackGeo(new THREE.BufferGeometry());
    secondaryGeo.setAttribute('position', new THREE.BufferAttribute(secondaryPositions, 3));
    const secondaryMat = trackMat(
      new THREE.LineBasicMaterial({
        color: 0x1D4ED8,
        transparent: true,
        opacity: 0.32,
        linewidth: 1,
      })
    );
    const secondaryLine = new THREE.Line(secondaryGeo, secondaryMat);
    formation.add(secondaryLine);

    // 3. Fluid Pulse Spark
    const sparkGeo = trackGeo(new THREE.SphereGeometry(0.12, 16, 16));
    const sparkMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x38BDF8,
        transparent: true,
        opacity: 0.9,
      })
    );
    const flowSpark = new THREE.Mesh(sparkGeo, sparkMat);
    flowSpark.position.copy(splinePoints[0]);
    formation.add(flowSpark);

    // ── SUSPENDED ATMOSPHERIC PARTICLES ─────────────────────────────
    const PARTICLE_COUNT = isMobile ? 35 : 85;
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    const particleVelocity: { x: number; y: number; z: number; phase: number }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particlePositions[i * 3 + 0] = (Math.random() - 0.5) * 16;
      particlePositions[i * 3 + 1] = Math.random() * 7.0;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
      particleVelocity.push({
        x: (Math.random() - 0.5) * 0.0012,
        y: 0.0012 + Math.random() * 0.002,
        z: (Math.random() - 0.5) * 0.0012,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const particleGeo = trackGeo(new THREE.BufferGeometry());
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = trackMat(
      new THREE.PointsMaterial({
        color: 0x38BDF8,
        size: isMobile ? 0.03 : 0.04,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
      })
    );
    const particles = new THREE.Points(particleGeo, particleMat);
    formation.add(particles);

    // ── POINTER PARALLAX & SCROLL INTERPOLATION ─────────────────────
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;
    let scrollY = window.scrollY;

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const onScroll = () => {
      scrollY = window.scrollY;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── RESIZE OBSERVER ─────────────────────────────────────────────
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = entry.contentRect.width;
        const newH = entry.contentRect.height;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          const newPos = getBaseCamPos(newW);
          baseCamPos.copy(newPos);
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // ── INTERSECTION OBSERVER (Off-screen render suspension) ────────
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    // ── REDUCED MOTION STATIC RENDER ────────────────────────────────
    if (prefersReducedMotion) {
      sanctumVoidLight.intensity = 1.4;
      tracerDynamicLight.intensity = 1.2;
      obsidianMat.emissiveIntensity = 0.16;
      cageMat.opacity = 0.2;
      renderer.render(scene, camera);
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('scroll', onScroll);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        disposeThreeScene(renderer, scene, geometries, materials);
      };
    }

    // ── ANIMATION & RENDER LOOP ─────────────────────────────────────
    const clock = new THREE.Clock();

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);

      if (!isVisible) return;

      const t = clock.getElapsedTime();

      // Damped Pointer Interpolation: Slow and cinematic (factor: 0.02)
      currentMouseX += (targetMouseX - currentMouseX) * 0.02;
      currentMouseY += (targetMouseY - currentMouseY) * 0.02;

      // Scroll factor [0..1]
      const heroHeight = window.innerHeight || 800;
      const scrollFactor = Math.min(1.0, Math.max(0, scrollY / heroHeight));

      // 1. Fluid Spline Motion: Slow, dignified traversal along the Catmull-Rom curve
      const speed = 0.065; // Cycles once every ~15 seconds smoothly
      const u = (t * speed) % 1.0;
      const sparkPos = fluidCurve.getPointAt(u);
      flowSpark.position.copy(sparkPos);

      // Move dynamic tracer point light with the spark
      tracerDynamicLight.position.copy(sparkPos);
      tracerDynamicLight.intensity = 1.4 + Math.sin(t * 1.5) * 0.4;

      // Subtle breathing on primary and secondary line opacities
      primaryMat.opacity = 0.50 + Math.sin(t * 1.2) * 0.15;
      secondaryMat.opacity = 0.26 + Math.sin(t * 0.8) * 0.08;

      // 2. Sanctum Core Internal Breathing
      const corePulse = Math.sin(t * 0.8) * 0.5 + 0.5;
      sanctumVoidLight.intensity = 1.2 + corePulse * 0.6;
      obsidianMat.emissiveIntensity = 0.10 + corePulse * 0.08;
      altar.rotation.y = Math.sin(t * 0.08) * 0.015;

      // 3. Suspended Atmospheric Particles: Slow vertical drift
      const pAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const vel = particleVelocity[i];
        const px = pAttr.getX(i) + vel.x + Math.sin(t * 0.2 + vel.phase) * 0.0006;
        let py = pAttr.getY(i) + vel.y;
        const pz = pAttr.getZ(i) + vel.z;

        if (py > 7.0) py = 0.1;
        pAttr.setXYZ(i, px, py, pz);
      }
      pAttr.needsUpdate = true;

      // 4. Subtle Damped Camera Crane & Scroll Tracking
      const scrollCamY = scrollFactor * 1.4;
      const scrollCamZ = scrollFactor * 1.1;

      const targetCamX = baseCamPos.x + currentMouseX * 0.32 + Math.sin(t * 0.03) * 0.06;
      const targetCamY = baseCamPos.y + currentMouseY * 0.22 - scrollCamY;
      const targetCamZ = baseCamPos.z + scrollCamZ;

      camera.position.x += (targetCamX - camera.position.x) * 0.02;
      camera.position.y += (targetCamY - camera.position.y) * 0.02;
      camera.position.z += (targetCamZ - camera.position.z) * 0.02;

      const lookTargetY = 1.4 - scrollFactor * 0.8;
      camera.lookAt(0.4, lookTargetY, 0);

      renderer.render(scene, camera);
    };

    renderLoop();

    // ── UNMOUNT CLEANUP ─────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      disposeThreeScene(renderer, scene, geometries, materials);
    };
  }, [prefersReducedMotion]);

  if (!webGlSupported) {
    return (
      <div className={`w-full h-full min-h-[500px] flex items-center justify-center p-8 bg-[#090D16] border border-white/[0.08] rounded-3xl text-left ${className}`}>
        <div className="space-y-4 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono text-xs">
            <span>STATIC FALLBACK // WEBGL DISABLED</span>
          </div>
          <h3 className="text-xl font-bold text-white font-sans">
            Monolithic Ziggurat Architecture
          </h3>
          <p className="text-sm text-neutral-400 font-sans leading-relaxed">
            Hardware acceleration is unavailable. Platform features, diagnostic evaluation, and containerized runtime remain operational.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full min-h-[460px] md:min-h-[560px] lg:min-h-[640px] overflow-hidden ${className}`}
      aria-label="3D Monolithic Ziggurat & Terraced Bastion Interactive Environment"
      role="img"
    />
  );
};

export default ChakravyuhaHero;
