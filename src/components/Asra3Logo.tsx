'use client';

import React, { useId } from 'react';

interface Asra3MarkProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP: Record<NonNullable<Asra3MarkProps['size']>, string> = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-14 w-14',
};

/**
 * Bespoke Asra3 Geometric Brand Emblem
 * Combines an aerodynamic Delta "A" wing, a supersonic kinetic lightning crossbar,
 * and an omnichannel broadcast apex node inside a luxury coral-amber squircle shield.
 */
export function Asra3Mark({ size = 'md', className = '' }: Asra3MarkProps) {
  const uid = useId().replace(/:/g, '');
  const bgGradId = `asra3-bg-${uid}`;
  const bladeGradId = `asra3-blade-${uid}`;
  const boltGradId = `asra3-bolt-${uid}`;
  const glowGradId = `asra3-glow-${uid}`;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${SIZE_MAP[size]} ${className}`}
    >
      <svg
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full drop-shadow-[0_6px_16px_rgba(235,53,20,0.32)] transition-transform duration-300 group-hover:scale-105"
        role="img"
        aria-label="Asra3 Emblem"
      >
        <defs>
          {/* Main Luxury Coral-to-Crimson Squircle Gradient */}
          <linearGradient id={bgGradId} x1="4" y1="2" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF5533" />
            <stop offset="48%" stopColor="#EB3514" />
            <stop offset="100%" stopColor="#A81805" />
          </linearGradient>

          {/* Ambient Top-Left Radial Highlight */}
          <radialGradient
            id={glowGradId}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(13 10) rotate(45) scale(26)"
          >
            <stop offset="0%" stopColor="#FF9E7D" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#EB3514" stopOpacity="0" />
          </radialGradient>

          {/* Pure White-to-Warm Ivory Delta Wing Gradient */}
          <linearGradient id={bladeGradId} x1="12" y1="9" x2="32" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFE4DC" />
          </linearGradient>

          {/* Kinetic Gold-Amber Supersonic Slash Gradient */}
          <linearGradient id={boltGradId} x1="11" y1="26" x2="35" y2="17" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>

        {/* 1. Squircle Base Shield */}
        <rect x="2" y="2" width="40" height="40" rx="12" fill={`url(#${bgGradId})`} />
        <rect x="2" y="2" width="40" height="40" rx="12" fill={`url(#${glowGradId})`} />

        {/* 2. Precision Inner Glass Bevel */}
        <rect
          x="2.75"
          y="2.75"
          width="38.5"
          height="38.5"
          rx="11.25"
          stroke="white"
          strokeOpacity="0.28"
          strokeWidth="1.2"
        />

        {/* 3. Subtle Orbital Omnichannel Arc */}
        <path
          d="M10 17C12.8 11.2 18.7 8 25.2 9.2"
          stroke="white"
          strokeOpacity="0.32"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* 4. Aerodynamic Delta "A" Monogram Blades */}
        <path
          d="M23.2 8.8L10.8 33.4C10.3 34.3 11 35.4 12 35.4H16.4C17.1 35.4 17.7 35 18 34.3L22.9 23.8L27.2 34.3C27.5 35 28.1 35.4 28.8 35.4H33.2C34.2 35.4 34.9 34.3 34.4 33.4L25.6 8.8C25.1 7.7 23.7 7.7 23.2 8.8Z"
          fill={`url(#${bladeGradId})`}
        />

        {/* 5. Supersonic Speed Crossbar (The "Asra3 / Faster" Vector Slash) */}
        <path
          d="M11.5 26.8L34.5 18.2L29.8 25.4L11.5 26.8Z"
          fill={`url(#${boltGradId})`}
        />

        {/* 6. Broadcast Signal Node at Top Right */}
        <circle cx="32.5" cy="11.5" r="2.2" fill="#FDE68A" />
        <circle cx="32.5" cy="11.5" r="3.8" stroke="#FDE68A" strokeOpacity="0.4" strokeWidth="1" />
      </svg>
    </div>
  );
}

interface Asra3LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showDomainBadge?: boolean;
  subtitle?: string;
  className?: string;
}

/**
 * Complete Asra3 Brand Lockup (Emblem + Stylized Wordmark + Live Domain Pill)
 */
export function Asra3Logo({
  size = 'md',
  showDomainBadge = true,
  subtitle,
  className = '',
}: Asra3LogoProps) {
  const textSize =
    size === 'sm'
      ? 'text-lg'
      : size === 'lg'
      ? 'text-2xl'
      : 'text-xl';

  return (
    <div className={`group inline-flex items-center gap-2.5 select-none ${className}`}>
      <Asra3Mark size={size} />

      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          {/* Custom Stylized Wordmark: Asra + Highlighted 3 */}
          <span
            dir="ltr"
            className={`${textSize} font-extrabold tracking-tight leading-none text-[var(--text-primary)] inline-flex items-baseline`}
          >
            <span>Asra</span>
            <span className="bg-gradient-to-tr from-[var(--brand-coral)] via-[#ff5533] to-amber-500 bg-clip-text text-transparent font-black">
              3
            </span>
          </span>

          {showDomainBadge && (
            <span
              dir="ltr"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-coral)]/25 bg-[var(--brand-coral-soft)] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[var(--brand-coral)] shadow-2xs"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>asra3.com</span>
            </span>
          )}
        </div>

        {subtitle && (
          <span className="mt-0.5 text-[11px] font-medium text-[var(--text-secondary)] truncate max-w-[240px]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
