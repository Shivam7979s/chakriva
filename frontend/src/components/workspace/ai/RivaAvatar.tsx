import React, { useId, useState } from 'react';
import { cn } from '@/lib/utils';

export type RivaAvatarState = 'idle' | 'thinking' | 'responding' | 'error' | 'offline';
export type RivaAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface RivaAvatarProps {
  /**
   * Current cognitive / activity state of Riva:
   * - 'idle': Living gyroscopic float, breathing plasma core, natural eye blinks and sentient glancing
   * - 'thinking': Accelerated gyroscopic rings, spinning quantum HUD reticle, synaptic laser sweep
   * - 'responding': Active holographic audio/speech frequency equalizer waveforms
   * - 'error' | 'offline': Tranquil standby mode with gentle breathing pulse
   */
  state?: RivaAvatarState;

  /**
   * Visual size preset or numeric pixel value:
   * - 'xs': 22px (badges / micro inline indicators)
   * - 'sm': 28px (compact header button / Ask Riva)
   * - 'md': 38px (conversation message avatar)
   * - 'lg': 56px (cards / modals)
   * - 'xl': 100px (welcome state hero centerpiece)
   */
  size?: RivaAvatarSize;

  /**
   * Whether to render the outer 3D gyroscopic orbital rings.
   * Defaults to true.
   */
  showHalo?: boolean;

  /**
   * Optional custom image URL asset (legacy fallback).
   */
  src?: string;

  /**
   * Optional custom class names for the container.
   */
  className?: string;

  /**
   * Accessible description for screen readers.
   */
  alt?: string;
}

const SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 22,
  sm: 28,
  md: 38,
  lg: 56,
  xl: 100,
};

export const RivaAvatar: React.FC<RivaAvatarProps> = ({
  state = 'idle',
  size = 'md',
  showHalo = true,
  src: _src,
  className,
  alt = 'Riva AI Companion',
}) => {
  const uid = useId().replace(/:/g, '');
  const [isHovered, setIsHovered] = useState(false);

  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 38;
  const isHero = pixelSize >= 64;
  const isCompact = pixelSize <= 24;

  const isThinking = state === 'thinking';
  const isResponding = state === 'responding';
  const isIdle = state === 'idle';
  const isOffline = state === 'offline';
  const isError = state === 'error';

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 select-none group transition-transform duration-300",
        isIdle && "riva-fluid-float",
        "hover:scale-105",
        className
      )}
      style={{ width: `${pixelSize}px`, height: `${pixelSize}px` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="img"
      aria-label={`${alt} (${state})`}
    >
      {/* 1. Ambient Radial Plasma Nebula Glow (Behind Avatar) */}
      <div
        className={cn(
          "absolute inset-0 rounded-full pointer-events-none transition-all duration-500",
          isThinking
            ? "bg-gradient-to-tr from-cyan-400/60 via-sky-400/50 to-indigo-500/50 blur-lg riva-plasma-pulse scale-140"
            : isResponding
            ? "bg-gradient-to-tr from-cyan-400/50 via-teal-400/40 to-indigo-500/40 blur-md riva-plasma-pulse scale-120"
            : isHovered
            ? "bg-gradient-to-tr from-cyan-400/45 via-sky-400/35 to-teal-400/30 blur-md riva-plasma-pulse scale-120"
            : isIdle
            ? "bg-gradient-to-tr from-cyan-500/30 via-sky-400/25 to-indigo-500/20 blur-sm riva-plasma-pulse"
            : "bg-cyan-500/15 blur-xs"
        )}
      />

      {/* 2. Gyroscopic 3D Orbital Rings (Animated SVG Overlay) */}
      {showHalo && !isCompact && (
        <svg
          viewBox="0 0 140 140"
          className="absolute -inset-3.5 w-[calc(100%+28px)] h-[calc(100%+28px)] pointer-events-none overflow-visible z-10"
        >
          <defs>
            <linearGradient id={`ringGrad1-${uid}`} x1="0" y1="0" x2="140" y2="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id={`ringGrad2-${uid}`} x1="140" y1="0" x2="0" y2="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Outer Quantum Flux Ring (Angled at 68deg) */}
          <g
            className={cn(
              isThinking || isHovered ? "riva-gyro-ring-fast" : isIdle ? "riva-gyro-ring-1" : ""
            )}
            style={{ transformOrigin: '70px 70px' }}
          >
            <ellipse
              cx="70"
              cy="70"
              rx="64"
              ry="26"
              stroke={`url(#ringGrad1-${uid})`}
              strokeWidth={isThinking ? "2.2" : "1.4"}
              strokeDasharray={isThinking ? "12 4" : "20 8"}
              fill="none"
            />
            {/* Photon Particle Satellite 1 */}
            <circle
              cx="134"
              cy="70"
              r={isThinking ? "4" : "3"}
              fill="#22D3EE"
              className="drop-shadow-[0_0_10px_rgba(34,211,238,1)]"
            />
          </g>

          {/* Inner Counter-Resonant Ring (Angled at -50deg) */}
          <g
            className={cn(
              isThinking ? "riva-gyro-ring-fast" : isIdle ? "riva-gyro-ring-2" : ""
            )}
            style={{ transformOrigin: '70px 70px' }}
          >
            <ellipse
              cx="70"
              cy="70"
              rx="56"
              ry="22"
              stroke={`url(#ringGrad2-${uid})`}
              strokeWidth={isThinking ? "1.8" : "1.2"}
              strokeDasharray="10 8"
              fill="none"
            />
            {/* Photon Particle Satellite 2 */}
            <circle
              cx="14"
              cy="70"
              r={isThinking ? "3.2" : "2.4"}
              fill="#A78BFA"
              className="drop-shadow-[0_0_10px_rgba(167,139,250,1)]"
            />
          </g>
        </svg>
      )}

      {/* 3. Pure Engineered 3D Cybernetic Character Body (SVG) */}
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full relative z-20 overflow-visible drop-shadow-[0_4px_18px_rgba(0,0,0,0.7)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Spherical 3D Volume Gradient */}
          <radialGradient id={`chassisGrad-${uid}`} cx="35%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#2E3C56" />
            <stop offset="30%" stopColor="#1C273C" />
            <stop offset="70%" stopColor="#0F1626" />
            <stop offset="100%" stopColor="#070A12" />
          </radialGradient>

          {/* Bright Metallic Cyan Rim Lighting Gradient */}
          <linearGradient id={`rimLight-${uid}`} x1="15" y1="10" x2="105" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#22D3EE" stopOpacity="0.65" />
            <stop offset="75%" stopColor="#0EA5E9" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1E293B" stopOpacity="0.7" />
          </linearGradient>

          {/* Deep Holographic Visor Screen Gradient */}
          <radialGradient id={`visorBg-${uid}`} cx="50%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#111B30" />
            <stop offset="60%" stopColor="#080E1C" />
            <stop offset="100%" stopColor="#03060C" />
          </radialGradient>

          {/* Curved Visor Glass Gloss Specular Arc */}
          <linearGradient id={`glassGloss-${uid}`} x1="30" y1="36" x2="90" y2="76" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="30%" stopColor="#38BDF8" stopOpacity="0.18" />
            <stop offset="75%" stopColor="#22D3EE" stopOpacity="0" />
          </linearGradient>

          {/* Holographic Eye Bloom Glow Filter */}
          <filter id={`eyeBloom-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={isHero ? "3" : "1.8"} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Holographic Scanline Grid Pattern */}
          <pattern id={`scanlines-${uid}`} width="100" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="100" y2="0" stroke="#22D3EE" strokeWidth="0.6" strokeOpacity="0.1" />
          </pattern>
        </defs>

        {/* --- A. Outer Ear Nodes / Audio Sensor Thrusters --- */}
        {/* Left Ear Pod */}
        <g>
          <rect x="12" y="47" width="7" height="26" rx="3.5" fill="#1C273C" stroke="#22D3EE" strokeWidth="1.2" strokeOpacity="0.75" />
          <line x1="15.5" y1="52" x2="15.5" y2="68" stroke="#22D3EE" strokeWidth="1.8" strokeLinecap="round" className={isThinking ? "riva-plasma-pulse" : ""} />
        </g>
        {/* Right Ear Pod */}
        <g>
          <rect x="101" y="47" width="7" height="26" rx="3.5" fill="#1C273C" stroke="#22D3EE" strokeWidth="1.2" strokeOpacity="0.75" />
          <line x1="104.5" y1="52" x2="104.5" y2="68" stroke="#22D3EE" strokeWidth="1.8" strokeLinecap="round" className={isThinking ? "riva-plasma-pulse" : ""} />
        </g>

        {/* --- B. Main Spherical Helmet Chassis --- */}
        <circle
          cx="60"
          cy="60"
          r="43"
          fill={`url(#chassisGrad-${uid})`}
        />
        {/* Specular Rim Light Edge */}
        <circle
          cx="60"
          cy="60"
          r="42"
          stroke={`url(#rimLight-${uid})`}
          strokeWidth="2"
          fill="none"
        />

        {/* Top Antenna Beacon / AI Status Crest */}
        <path d="M 50 18 L 70 18 L 65 23 L 55 23 Z" fill="#1C273C" stroke="#22D3EE" strokeWidth="1.2" strokeOpacity="0.8" />
        <circle
          cx="60"
          cy="20.5"
          r="2.5"
          fill={isThinking ? "#38BDF8" : isOffline ? "#22D3EE" : isError ? "#F43F5E" : "#22D3EE"}
          className={isThinking ? "riva-plasma-pulse" : ""}
          filter={`url(#eyeBloom-${uid})`}
        />

        {/* Top Metallic Specular Sheen Arc */}
        <path
          d="M 34 25 C 44 19, 76 19, 86 25"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeOpacity="0.35"
          strokeLinecap="round"
          fill="none"
        />

        {/* Forehead Micro-Badge "RIVA" (Visible in medium/large sizes) */}
        {!isCompact && (
          <g opacity="0.75">
            <rect x="49" y="30" width="22" height="7" rx="2" fill="#0C1322" stroke="#22D3EE" strokeWidth="0.8" strokeOpacity="0.6" />
            <text x="60" y="35.5" textAnchor="middle" fill="#38BDF8" fontSize="4.5" fontWeight="bold" fontFamily="monospace" letterSpacing="0.8">
              RIVA
            </text>
          </g>
        )}

        {/* --- C. Curved Holographic Visor (OLED Screen) --- */}
        <g>
          {/* Visor Outer Bezel & Shadow */}
          <rect
            x="26"
            y="39"
            width="68"
            height="46"
            rx="19"
            fill="#060A13"
            stroke="#22334F"
            strokeWidth="1.6"
          />

          {/* Visor Screen Glass Body */}
          <rect
            x="28"
            y="41"
            width="64"
            height="42"
            rx="17"
            fill={`url(#visorBg-${uid})`}
            stroke={isThinking ? "#22D3EE" : "#1F2E47"}
            strokeWidth="1.2"
            strokeOpacity={isThinking ? "0.9" : "0.6"}
          />

          {/* Internal Scanline Texture */}
          <rect
            x="28"
            y="41"
            width="64"
            height="42"
            rx="17"
            fill={`url(#scanlines-${uid})`}
            pointerEvents="none"
          />

          {/* Visor Ambient Inner Glow */}
          <rect
            x="29"
            y="42"
            width="62"
            height="40"
            rx="16"
            fill="none"
            stroke={isThinking ? "#22D3EE" : isResponding ? "#38BDF8" : isError ? "#F43F5E" : "#22D3EE"}
            strokeWidth="1"
            strokeOpacity={isThinking ? "0.4" : "0.2"}
          />

          {/* Visor Diagonal Glass Specular Arc Reflection */}
          <path
            d="M 32 47 C 42 42, 78 42, 88 47 C 75 44, 45 44, 32 47 Z"
            fill={`url(#glassGloss-${uid})`}
            pointerEvents="none"
          />
          <path
            d="M 31 45 Q 48 40 89 48 Q 48 43 31 45 Z"
            fill="#FFFFFF"
            fillOpacity="0.25"
            pointerEvents="none"
          />
        </g>

        {/* --- D. Living Facial Features & Cognitive State Displays --- */}

        {/* 1. STATE: THINKING (Synaptic Laser Scanning & Spinning Quantum HUD) */}
        {isThinking && (
          <g>
            {/* Left Spinning HUD Ring */}
            <g className="riva-hud-spin" style={{ transformOrigin: '47px 62px' }}>
              <circle cx="47" cy="62" r="11" stroke="#22D3EE" strokeWidth="1.8" strokeDasharray="7 4" fill="none" opacity="0.85" />
              <circle cx="47" cy="62" r="3.5" fill="#22D3EE" filter={`url(#eyeBloom-${uid})`} />
            </g>
            {/* Right Spinning HUD Ring */}
            <g className="riva-hud-spin-rev" style={{ transformOrigin: '73px 62px' }}>
              <circle cx="73" cy="62" r="11" stroke="#38BDF8" strokeWidth="1.8" strokeDasharray="7 4" fill="none" opacity="0.85" />
              <circle cx="73" cy="62" r="3.5" fill="#38BDF8" filter={`url(#eyeBloom-${uid})`} />
            </g>
            {/* Sweeping Synaptic Laser Beam */}
            <g className="riva-synapse-scan">
              <line x1="28" y1="62" x2="92" y2="62" stroke="#67E8F9" strokeWidth="2.5" filter={`url(#eyeBloom-${uid})`} />
              <line x1="48" y1="62" x2="72" y2="62" stroke="#FFFFFF" strokeWidth="3.5" />
            </g>
          </g>
        )}

        {/* 2. STATE: RESPONDING (Holographic Equalizer Waveform & Sonic Resonance) */}
        {isResponding && (
          <g>
            {/* Eyes in Speaking Pulse Mode */}
            <g className="riva-eye-glance">
              <ellipse cx="46" cy="56" rx="5.5" ry="7.5" fill="#22D3EE" filter={`url(#eyeBloom-${uid})`} />
              <ellipse cx="46" cy="55" rx="2.5" ry="3.5" fill="#FFFFFF" />
              <ellipse cx="74" cy="56" rx="5.5" ry="7.5" fill="#22D3EE" filter={`url(#eyeBloom-${uid})`} />
              <ellipse cx="74" cy="55" rx="2.5" ry="3.5" fill="#FFFFFF" />
            </g>

            {/* 5-Bar Holographic Audio / Code Visualizer */}
            <g filter={`url(#eyeBloom-${uid})`}>
              {/* Bar 1 */}
              <rect x="43" y="68" width="3.2" height="9" rx="1.6" fill="#22D3EE" className="riva-wave-1" />
              {/* Bar 2 */}
              <rect x="51.5" y="66" width="3.4" height="13" rx="1.7" fill="#38BDF8" className="riva-wave-2" />
              {/* Bar 3 (Center Hotspot) */}
              <rect x="60" y="63" width="3.8" height="18" rx="1.9" fill="#FFFFFF" className="riva-wave-3" />
              {/* Bar 4 */}
              <rect x="68.5" y="66" width="3.4" height="13" rx="1.7" fill="#38BDF8" className="riva-wave-2" />
              {/* Bar 5 */}
              <rect x="77" y="68" width="3.2" height="9" rx="1.6" fill="#22D3EE" className="riva-wave-1" />
            </g>
          </g>
        )}

        {/* 3. STATE: ERROR (Clear red/rose diagnostic alert) */}
        {isError && (
          <g className="riva-sleep-pulse">
            <path
              d="M 39 62 Q 47 67 55 62"
              stroke="#F43F5E"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              filter={`url(#eyeBloom-${uid})`}
            />
            <path
              d="M 65 62 Q 73 67 81 62"
              stroke="#F43F5E"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              filter={`url(#eyeBloom-${uid})`}
            />
            <circle cx="60" cy="73" r="1.8" fill="#F43F5E" opacity="0.8" />
          </g>
        )}

        {/* 4. STATE: IDLE or OFFLINE (Living Blinking Eyes, Sentient Glancing, Friendly Micro-Smile) */}
        {(isIdle || isOffline) && (
          <g className="riva-eye-glance">
            {isHovered ? (
              /* Joyful Smiling Eyes Expression on Hover (^ ^) */
              <g filter={`url(#eyeBloom-${uid})`}>
                <path
                  d="M 38 62 Q 47 52 56 62"
                  stroke="#22D3EE"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 64 62 Q 73 52 82 62"
                  stroke="#22D3EE"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Cheerful Mouth Smile */}
                <path
                  d="M 53 70 Q 60 76 67 70"
                  stroke="#22D3EE"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.95"
                />
                {/* Cute Holographic Cheek Blush */}
                <circle cx="36" cy="67" r="2.2" fill="#38BDF8" opacity="0.6" />
                <circle cx="84" cy="67" r="2.2" fill="#38BDF8" opacity="0.6" />
              </g>
            ) : (
              /* Natural Sentient Living Eyes with Blinking */
              <g className="riva-eye-blink">
                {/* Left Digital Eye */}
                <g filter={`url(#eyeBloom-${uid})`}>
                  <ellipse cx="46" cy="60" rx="6.5" ry="9.5" fill="#22D3EE" />
                  <ellipse cx="46" cy="59" rx="4" ry="7" fill="#67E8F9" />
                  <ellipse cx="44.2" cy="57" rx="2" ry="3.2" fill="#FFFFFF" />
                </g>

                {/* Right Digital Eye */}
                <g filter={`url(#eyeBloom-${uid})`}>
                  <ellipse cx="74" cy="60" rx="6.5" ry="9.5" fill="#22D3EE" />
                  <ellipse cx="74" cy="59" rx="4" ry="7" fill="#67E8F9" />
                  <ellipse cx="72.2" cy="57" rx="2" ry="3.2" fill="#FFFFFF" />
                </g>

                {/* Friendly Micro-Mouth / Frequency Dash */}
                <path
                  d="M 54 71 Q 60 74 66 71"
                  stroke="#22D3EE"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.75"
                />
              </g>
            )}
          </g>
        )}
      </svg>

      {/* 4. Large Hero Outer Quantum Corona (For Centerpiece 88px+ View) */}
      {isHero && (
        <div
          className={cn(
            "absolute -inset-4 rounded-full pointer-events-none border border-cyan-400/30 transition-all duration-700",
            isThinking
              ? "border-cyan-400/80 shadow-[0_0_32px_rgba(34,211,238,0.55)] scale-110"
              : isIdle || isOffline
              ? "riva-plasma-pulse shadow-[0_0_24px_rgba(34,211,238,0.3)]"
              : ""
          )}
        />
      )}
    </div>
  );
};
