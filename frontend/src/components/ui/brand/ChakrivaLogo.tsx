import React from 'react';

export interface ChakrivaLogoProps {
  /** Size in pixels (number) or tailwind size class */
  size?: number | string;
  className?: string;
  /** Whether to show the "CHAKRIVA" text wordmark */
  showWordmark?: boolean;
  wordmarkClassName?: string;
  /** High-fidelity SVG vs lightweight SVG */
  variant?: 'hq' | 'lite';
  /** Optional subtitle or suffix e.g. "LABS" */
  suffix?: string;
}

/**
 * ChakrivaLogo — Canonical Brand Logo Mark for Chakriva
 * Features the official circular vortex/aperture ribbon swirl framing
 * the code chevron `<` and `C` monogram.
 */
export const ChakrivaLogo: React.FC<ChakrivaLogoProps> = ({
  size = 24,
  className = '',
  showWordmark = false,
  wordmarkClassName = '',
  variant = 'hq',
  suffix,
}) => {
  const src = variant === 'lite' ? '/chakriva-logo-lite.svg' : '/chakriva-logo.svg';
  const sizeStyle = typeof size === 'number' ? { width: size, height: size } : undefined;
  const sizeClass = typeof size === 'string' && (size.startsWith('w-') || size.startsWith('h-')) ? size : '';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={src}
        alt="CHAKRIVA"
        style={sizeStyle}
        className={`shrink-0 object-contain transition-transform duration-300 group-hover:scale-105 ${sizeClass}`}
      />
      {showWordmark && (
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-mono text-[13px] font-semibold tracking-[0.18em] text-[#F8FAFC] uppercase ${wordmarkClassName}`}
          >
            CHAKRIVA
          </span>
          {suffix && (
            <span className="text-[10px] font-mono font-medium text-[#8C909F] tracking-wider uppercase">
              {suffix}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ChakrivaLogo;

