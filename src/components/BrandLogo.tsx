/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  className?: string; // size classes like 'w-8 h-8'
  glow?: boolean;
}

export function BrandLogo({ className = 'w-8 h-8', glow = true }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {glow && (
        <div className="absolute inset-0 bg-blue-500/25 rounded-xl blur-md animate-pulse" />
      )}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background rounded slate block */}
        <rect
          x="8"
          y="8"
          width="84"
          height="84"
          rx="22"
          className="fill-slate-950 stroke-slate-800"
          strokeWidth="4"
        />
        
        {/* Inner glow shadow rings */}
        <rect
          x="14"
          y="14"
          width="72"
          height="72"
          rx="17"
          className="stroke-blue-900/40"
          strokeWidth="2"
        />

        {/* Database relational connectors inside */}
        <path
          d="M26 34 L32 34 M26 50 L32 50 M26 66 L32 66"
          stroke="rgba(148, 163, 184, 0.3)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* The Q character frame */}
        <circle
          cx="52"
          cy="48"
          r="18"
          className="stroke-blue-400"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Q Tail intersecting into a pointer */}
        <path
          d="M62 58 L76 72"
          className="stroke-indigo-400"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Glowing Spark Star of AI intelligence (Top-Right) */}
        <path
          d="M72 26 L76 34 L84 38 L76 42 L72 50 L68 42 L60 38 L68 34 Z"
          className="fill-emerald-400 animate-pulse"
        />
      </svg>
    </div>
  );
}

/**
 * Returns a high-fidelity SVG string of our logo, 
 * suitable for feeding directly into favicon markup as a data-url.
 */
export function getLogoSvgString(): string {
  return `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="84" height="84" rx="22" fill="#020617" stroke="#1e293b" stroke-width="4"/>
      <circle cx="52" cy="48" r="18" stroke="#3b82f6" stroke-width="7" stroke-linecap="round"/>
      <path d="M62 58 L76 72" stroke="#818cf8" stroke-width="7" stroke-linecap="round"/>
      <path d="M72 26 L76 34 L84 38 L76 42 L72 50 L68 42 L60 38 L68 34 Z" fill="#34d399"/>
    </svg>
  `.trim().replace(/\s+/g, ' ');
}
