import React, { useEffect, useRef } from 'react';

interface ChakrivaFluidWaveCanvasProps {
  className?: string;
  opacity?: number;
}

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

// Permutation polynomial for Simplex Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,
                      0.366025403784439,
                     -0.577350269189626,
                      0.024390243902439);
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

// Multi-octave FBM for liquid currents
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 4; ++i) {
    v += a * snoise(p);
    p = rot * p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

void main() {
  // Normalize screen coordinate with center at origin
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

  // Subtle mouse parallax
  vec2 mouseOffset = (u_mouse - 0.5) * 0.15;
  p += mouseOffset;

  // Rotate coordinates to create diagonal silk flow across the screen
  float angle = -0.42;
  float cosA = cos(angle);
  float sinA = sin(angle);
  mat2 rot = mat2(cosA, -sinA, sinA, cosA);
  vec2 pr = rot * p;

  float t = u_time * 0.22; // Majestic fluid movement

  // Main undulating silk wave spine
  float wave1 = sin(pr.x * 1.8 + t) * 0.35 + cos(pr.x * 1.1 - t * 0.55) * 0.22;
  float noise1 = fbm(pr * 1.5 + vec2(t * 0.09, -t * 0.07)) * 0.28;
  float spine1 = wave1 + noise1 - 0.05;

  float dist1 = pr.y - spine1;

  // Volumetric silk density (broad, rich falloff)
  float silkBody1 = exp(-pow(dist1 * 1.8, 2.0));
  float silkRim1 = exp(-pow((dist1 - 0.02) * 14.0, 2.0));
  float silkUnder1 = smoothstep(0.3, -0.6, dist1) * smoothstep(-1.3, -0.05, dist1) * 0.7;
  float silkGlow1 = exp(-pow(dist1 * 0.9, 2.0)) * 0.55;

  // Secondary deeper harmonic fold
  float wave2 = sin(pr.x * 1.3 - t * 0.75 + 1.2) * 0.38 + fbm(pr * 2.0 - vec2(t * 0.08, t * 0.11)) * 0.22;
  float dist2 = pr.y - (wave2 - 0.38);
  float silkBody2 = exp(-pow(dist2 * 1.6, 2.0)) * 0.65;
  float silkRim2 = exp(-pow((dist2 - 0.015) * 12.0, 2.0)) * 0.5;

  // Tertiary ambient atmosphere
  float wave3 = cos(pr.x * 0.9 + t * 0.4 - 1.5) * 0.45;
  float dist3 = pr.y - (wave3 + 0.45);
  float silkBody3 = exp(-pow(dist3 * 1.2, 2.0)) * 0.35;

  // Combined radiant density field
  float density = silkBody1 * 0.85 + silkUnder1 * 0.6 + silkBody2 * 0.55 + silkGlow1 * 0.4 + silkBody3 * 0.25;
  float rim = silkRim1 * 1.25 + silkRim2 * 0.65;

  // Micro-sheen ripples
  float ripple = snoise(pr * vec2(10.0, 40.0) + vec2(t * 0.12, -t * 0.15)) * 0.06;
  density = max(0.0, density + ripple * silkBody1);

  // Vibrant Chakriva Color Palette:
  vec3 colDeep = vec3(0.01, 0.14, 0.46);     // Royal midnight navy
  vec3 colMid = vec3(0.0, 0.54, 0.95);       // Radiant electric azure
  vec3 colCyan = vec3(0.12, 0.84, 0.99);     // Luminous liquid cyan
  vec3 colHighlight = vec3(0.82, 0.96, 1.0); // Specular crest sheen

  vec3 col = vec3(0.005, 0.008, 0.015); // Deep dark void
  col = mix(col, colDeep, smoothstep(0.06, 0.35, density));
  col = mix(col, colMid, smoothstep(0.28, 0.68, density));
  col = mix(col, colCyan, smoothstep(0.62, 1.05, density));
  col += colHighlight * rim * 1.15;
  col += colCyan * rim * 0.55;

  // Subtle edge vignette
  float vignette = smoothstep(1.6, 0.45, length(p));
  col *= mix(0.7, 1.0, vignette);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const ChakrivaFluidWaveCanvas: React.FC<ChakrivaFluidWaveCanvasProps> = ({
  className = 'w-full h-full object-cover',
  opacity = 0.95,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      powerPreference: 'high-performance',
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });

    if (!gl) {
      console.warn('WebGL not supported');
      return;
    }

    const createShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragShader = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Full screen quad geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse');

    let currentMouseX = 0.5;
    let currentMouseY = 0.5;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;

    const handlePointerMove = (e: PointerEvent) => {
      targetMouseX = e.clientX / window.innerWidth;
      targetMouseY = 1.0 - e.clientY / window.innerHeight;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    let width = 0;
    let height = 0;

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const displayWidth = Math.floor((window.innerWidth || canvas.clientWidth || 1280) * dpr);
      const displayHeight = Math.floor((window.innerHeight || canvas.clientHeight || 800) * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        width = displayWidth;
        height = displayHeight;
        gl.viewport(0, 0, width, height);
      }
    };

    window.addEventListener('resize', resize, { passive: true });
    resize();

    let animationFrameId: number;
    const startTime = performance.now();

    const render = (now: number) => {
      if (width === 0 || height === 0) {
        resize();
      }

      currentMouseX += (targetMouseX - currentMouseX) * 0.04;
      currentMouseY += (targetMouseY - currentMouseY) * 0.04;

      const elapsed = (now - startTime) * 0.001;

      gl.useProgram(program);
      gl.uniform2f(resolutionLocation, width, height);
      gl.uniform1f(timeLocation, elapsed);
      gl.uniform2f(mouseLocation, currentMouseX, currentMouseY);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      if (vertShader) gl.deleteShader(vertShader);
      if (fragShader) gl.deleteShader(fragShader);
      if (program) gl.deleteProgram(program);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ opacity }}
    >
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          width: '100vw',
          height: '100vh',
          display: 'block',
        }}
      />
    </div>
  );
};
