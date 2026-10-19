import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ChakrivaLiquidSilkCanvasProps {
  className?: string;
  opacity?: number;
}

const VERTEX_SHADER = `
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vElevation;

// Simplex 2D noise for organic micro-undulations
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float getWave(vec2 p, float t) {
  // Calm, majestic, broad sweeping folds (less chaotic, silky fluid flow)
  float w1 = sin(p.x * 0.65 + t * 0.32) * cos(p.y * 0.52 + t * 0.24) * 1.45;
  float w2 = sin(p.x * 1.15 - t * 0.22 + p.y * 0.65) * 0.65;
  float n1 = snoise(p * 0.6 + vec2(t * 0.09, -t * 0.06)) * 0.35;
  return w1 + w2 + n1;
}

void main() {
  vUv = uv;
  vec3 pos = position;

  // Diagonal coordinates for sweeping silk ribbon
  vec2 p = pos.xy * 0.28;
  p += uMouse * 0.15;

  float elevation = getWave(p, uTime);
  pos.z += elevation * 1.3;

  vElevation = elevation;
  vPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

  // Approximate analytical surface normals
  float eps = 0.08;
  float eX = getWave(p + vec2(eps, 0.0), uTime) * 1.3;
  float eY = getWave(p + vec2(0.0, eps), uTime) * 1.3;
  vec3 tangentX = vec3(eps, 0.0, eX - elevation * 1.3);
  vec3 tangentY = vec3(0.0, eps, eY - elevation * 1.3);
  vec3 norm = normalize(cross(tangentX, tangentY));
  vNormal = normalize(normalMatrix * norm);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform float uTime;
uniform vec3 uColorBase;
uniform vec3 uColorMid;
uniform vec3 uColorHighlight;
uniform vec3 uColorRim;
uniform vec3 uLightPos1;
uniform vec3 uLightPos2;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vElevation;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vPosition);

  // Dynamic Cyan Light (Key light - focused specular, subdued diffuse)
  vec3 lightDir1 = normalize(uLightPos1 - vPosition);
  float diff1 = max(dot(normal, lightDir1), 0.0);
  vec3 halfDir1 = normalize(lightDir1 + viewDir);
  float spec1 = pow(max(dot(normal, halfDir1), 0.0), 48.0);

  // Dynamic Sapphire Light (Fill light)
  vec3 lightDir2 = normalize(uLightPos2 - vPosition);
  float diff2 = max(dot(normal, lightDir2), 0.0);
  vec3 halfDir2 = normalize(lightDir2 + viewDir);
  float spec2 = pow(max(dot(normal, halfDir2), 0.0), 32.0);

  // Volumetric Fresnel rim glow (sharp, delicate liquid silk rim)
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.2);

  // Deep dark elevation base
  float heightFactor = smoothstep(-1.2, 1.4, vElevation);
  vec3 col = mix(uColorBase, uColorMid, heightFactor * 0.7);
  
  // Specular sheen and controlled glints (not flat diffuse blowout)
  col += uColorHighlight * (spec1 * 0.95 + diff1 * 0.12);
  col += uColorRim * (fresnel * 0.85 + spec2 * 0.45);

  // Center vignette mask behind hero text for pristine contrast & legibility
  float centerDist = length(vPosition.xy * vec2(0.85, 1.15));
  float textVignette = smoothstep(0.8, 3.8, centerDist);
  col *= mix(0.42, 1.0, textVignette);

  // Soft perimeter fade to dissolve plane smoothly into void
  float edgeX = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
  float edgeY = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
  float alpha = edgeX * edgeY * 0.92;

  gl_FragColor = vec4(col, alpha);
}
`;

export const ChakrivaLiquidSilkCanvas: React.FC<ChakrivaLiquidSilkCanvasProps> = ({
  className = 'w-full h-full object-cover',
  opacity = 0.58,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();

    const initWidth = container.clientWidth || window.innerWidth || 1440;
    const initHeight = container.clientHeight || window.innerHeight || 900;

    const camera = new THREE.PerspectiveCamera(
      45,
      initWidth / initHeight,
      0.1,
      100
    );
    camera.position.set(-1.2, -1.8, 6.2);
    camera.lookAt(0.2, 0.4, 0.0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(initWidth, initHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 3. 3D Silk Geometry
    const geometry = new THREE.PlaneGeometry(16, 11, 100, 75);

    // 4. Custom Volumetric Silk Shader Material with Deep-Moody Palette
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColorBase: { value: new THREE.Color(0x010308) },       // Deep obsidian void
      uColorMid: { value: new THREE.Color(0x041838) },        // Midnight oceanic navy
      uColorHighlight: { value: new THREE.Color(0x0284c7) },  // Electric azure specular glint
      uColorRim: { value: new THREE.Color(0x38bdf8) },        // Cyan rim accent
      uLightPos1: { value: new THREE.Vector3(2.5, 4.0, 4.5) },
      uLightPos2: { value: new THREE.Vector3(-3.5, -2.5, 3.0) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // Subtle architectural tilt
    mesh.rotation.x = -0.35;
    mesh.rotation.y = 0.22;
    mesh.rotation.z = -0.15;
    mesh.position.set(-0.5, 0.2, 0);
    scene.add(mesh);

    // 5. Mouse Parallax Tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // 6. Responsive Resize Handling
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth || window.innerWidth || 1440;
      const height = container.clientHeight || window.innerHeight || 900;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // 7. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse damping
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      uniforms.uTime.value = elapsedTime;
      uniforms.uMouse.value.set(currentMouseX, currentMouseY);

      // Subtle dynamic light orbit to give shifting liquid highlights
      uniforms.uLightPos1.value.x = Math.sin(elapsedTime * 0.45) * 4.0 + 1.0;
      uniforms.uLightPos1.value.y = Math.cos(elapsedTime * 0.35) * 3.5 + 2.0;

      uniforms.uLightPos2.value.x = -Math.cos(elapsedTime * 0.3) * 4.5;
      uniforms.uLightPos2.value.y = -Math.sin(elapsedTime * 0.4) * 3.0;

      // Gentle camera breath
      camera.position.x = -1.2 + currentMouseX * 0.35;
      camera.position.y = -1.8 + currentMouseY * 0.25;
      camera.lookAt(0.2, 0.4, 0.0);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // 8. Lifecycle Hygiene (Zero GPU leaks)
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden ${className}`}
      style={{ opacity }}
    />
  );
};
