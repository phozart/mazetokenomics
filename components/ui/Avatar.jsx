'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Cute chibi avatar with creative details
 * Using site brand colors
 */

// Site-themed color palettes (brand purples, accent teals)
const PALETTES = [
  { hair: '#5D4E37', hairLight: '#8B7355', skin: '#FFF0E6', skinBlush: '#E9B8FF', dress: '#A78BFA', dressLight: '#C4B5FD', bg: '#0D0D1A', accent: '#A78BFA', eye: '#60A5FA', eyeLight: '#93C5FD' },
  { hair: '#3D2B1F', hairLight: '#6B4423', skin: '#FFEDDE', skinBlush: '#D8B4FE', dress: '#8B5CF6', dressLight: '#A78BFA', bg: '#0A0A15', accent: '#8B5CF6', eye: '#A78BFA', eyeLight: '#C4B5FD' },
  { hair: '#4A3C31', hairLight: '#7D6B5D', skin: '#FFF2E8', skinBlush: '#C4B5FD', dress: '#6366F1', dressLight: '#818CF8', bg: '#0D0D18', accent: '#6366F1', eye: '#34D399', eyeLight: '#6EE7B7' },
  { hair: '#2F1E14', hairLight: '#5C4033', skin: '#FFE8D8', skinBlush: '#DDD6FE', dress: '#7C3AED', dressLight: '#8B5CF6', bg: '#08080F', accent: '#7C3AED', eye: '#F472B6', eyeLight: '#F9A8D4' },
  { hair: '#6B5344', hairLight: '#9E8B7D', skin: '#FFF4EC', skinBlush: '#C4B5FD', dress: '#A855F7', dressLight: '#C084FC', bg: '#0B0B14', accent: '#A855F7', eye: '#2DD4BF', eyeLight: '#5EEAD4' },
  { hair: '#4E4039', hairLight: '#7A6B5A', skin: '#FFEEE4', skinBlush: '#DDD6FE', dress: '#9333EA', dressLight: '#A855F7', bg: '#0A0A12', accent: '#9333EA', eye: '#818CF8', eyeLight: '#A5B4FC' },
];

const ACCESSORIES = [
  // Cat ears
  (cx, cy, s, p) => `
    <path d="M ${cx - s*0.28} ${cy - s*0.38} L ${cx - s*0.22} ${cy - s*0.52} L ${cx - s*0.14} ${cy - s*0.36}" fill="${p.hair}" stroke="${p.hairLight}" stroke-width="1"/>
    <path d="M ${cx + s*0.28} ${cy - s*0.38} L ${cx + s*0.22} ${cy - s*0.52} L ${cx + s*0.14} ${cy - s*0.36}" fill="${p.hair}" stroke="${p.hairLight}" stroke-width="1"/>
    <path d="M ${cx - s*0.24} ${cy - s*0.42} L ${cx - s*0.22} ${cy - s*0.48} L ${cx - s*0.18} ${cy - s*0.4}" fill="${p.accent}" opacity="0.4"/>
    <path d="M ${cx + s*0.24} ${cy - s*0.42} L ${cx + s*0.22} ${cy - s*0.48} L ${cx + s*0.18} ${cy - s*0.4}" fill="${p.accent}" opacity="0.4"/>
  `,
  // Bow
  (cx, cy, s, p) => `
    <ellipse cx="${cx - s*0.06}" cy="${cy - s*0.38}" rx="${s*0.06}" ry="${s*0.04}" fill="${p.accent}"/>
    <ellipse cx="${cx + s*0.06}" cy="${cy - s*0.38}" rx="${s*0.06}" ry="${s*0.04}" fill="${p.accent}"/>
    <circle cx="${cx}" cy="${cy - s*0.38}" r="${s*0.025}" fill="${p.accent}"/>
    <ellipse cx="${cx - s*0.05}" cy="${cy - s*0.39}" rx="${s*0.025}" ry="${s*0.015}" fill="white" opacity="0.4"/>
  `,
  // Crown
  (cx, cy, s, p) => `
    <path d="M ${cx - s*0.12} ${cy - s*0.34} L ${cx - s*0.08} ${cy - s*0.42} L ${cx} ${cy - s*0.36} L ${cx + s*0.08} ${cy - s*0.42} L ${cx + s*0.12} ${cy - s*0.34}"
          fill="${p.accent}" stroke="${p.accent}" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy - s*0.36}" r="${s*0.018}" fill="white" opacity="0.6"/>
  `,
  // Star clip
  (cx, cy, s, p) => `
    <path d="M ${cx + s*0.22} ${cy - s*0.3} l ${s*0.02} ${s*0.04} l ${s*0.045} ${s*0.005} l -${s*0.035} ${s*0.03} l ${s*0.01} ${s*0.045} l -${s*0.04} -${s*0.02} l -${s*0.04} ${s*0.02} l ${s*0.01} -${s*0.045} l -${s*0.035} -${s*0.03} l ${s*0.045} -${s*0.005} z"
          fill="${p.accent}"/>
  `,
];

const HAIR_STYLES = [
  // Twin buns
  (cx, cy, s, p) => `
    <ellipse cx="${cx}" cy="${cy - s*0.28}" rx="${s*0.38}" ry="${s*0.26}" fill="${p.hair}"/>
    <circle cx="${cx - s*0.26}" cy="${cy - s*0.44}" r="${s*0.11}" fill="${p.hair}"/>
    <circle cx="${cx + s*0.26}" cy="${cy - s*0.44}" r="${s*0.11}" fill="${p.hair}"/>
    <circle cx="${cx - s*0.28}" cy="${cy - s*0.46}" r="${s*0.045}" fill="${p.hairLight}" opacity="0.6"/>
    <circle cx="${cx + s*0.24}" cy="${cy - s*0.46}" r="${s*0.045}" fill="${p.hairLight}" opacity="0.6"/>
  `,
  // Ponytails
  (cx, cy, s, p) => `
    <ellipse cx="${cx}" cy="${cy - s*0.28}" rx="${s*0.36}" ry="${s*0.24}" fill="${p.hair}"/>
    <ellipse cx="${cx - s*0.32}" cy="${cy - s*0.16}" rx="${s*0.07}" ry="${s*0.16}" fill="${p.hair}"/>
    <ellipse cx="${cx + s*0.32}" cy="${cy - s*0.16}" rx="${s*0.07}" ry="${s*0.16}" fill="${p.hair}"/>
    <ellipse cx="${cx - s*0.34}" cy="${cy - s*0.2}" rx="${s*0.025}" ry="${s*0.08}" fill="${p.hairLight}" opacity="0.5"/>
    <ellipse cx="${cx + s*0.3}" cy="${cy - s*0.2}" rx="${s*0.025}" ry="${s*0.08}" fill="${p.hairLight}" opacity="0.5"/>
  `,
  // Bob
  (cx, cy, s, p) => `
    <ellipse cx="${cx}" cy="${cy - s*0.26}" rx="${s*0.4}" ry="${s*0.28}" fill="${p.hair}"/>
    <ellipse cx="${cx - s*0.26}" cy="${cy - s*0.1}" rx="${s*0.11}" ry="${s*0.16}" fill="${p.hair}"/>
    <ellipse cx="${cx + s*0.26}" cy="${cy - s*0.1}" rx="${s*0.11}" ry="${s*0.16}" fill="${p.hair}"/>
    <ellipse cx="${cx}" cy="${cy - s*0.38}" rx="${s*0.18}" ry="${s*0.08}" fill="${p.hairLight}" opacity="0.4"/>
  `,
  // Long
  (cx, cy, s, p) => `
    <ellipse cx="${cx}" cy="${cy - s*0.26}" rx="${s*0.38}" ry="${s*0.26}" fill="${p.hair}"/>
    <ellipse cx="${cx - s*0.24}" cy="${cy - s*0.04}" rx="${s*0.12}" ry="${s*0.22}" fill="${p.hair}"/>
    <ellipse cx="${cx + s*0.24}" cy="${cy - s*0.04}" rx="${s*0.12}" ry="${s*0.22}" fill="${p.hair}"/>
    <ellipse cx="${cx - s*0.28}" cy="${cy - s*0.08}" rx="${s*0.04}" ry="${s*0.14}" fill="${p.hairLight}" opacity="0.5"/>
    <ellipse cx="${cx + s*0.2}" cy="${cy - s*0.08}" rx="${s*0.04}" ry="${s*0.14}" fill="${p.hairLight}" opacity="0.5"/>
  `,
];

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function generateAvatarSvg(name, size = 80) {
  const hash = simpleHash(name || 'User');
  const p = PALETTES[hash % PALETTES.length];
  const hairStyle = HAIR_STYLES[(hash >> 3) % HAIR_STYLES.length];
  const accessory = ACCESSORIES[(hash >> 5) % ACCESSORIES.length];

  const cx = size / 2;
  const cy = size * 0.44;
  const s = size * 0.85;

  const sparkles = [
    { x: cx - s*0.4, y: cy - s*0.3 },
    { x: cx + s*0.42, y: cy - s*0.15 },
    { x: cx - s*0.35, y: cy + s*0.35 },
    { x: cx + s*0.38, y: cy + s*0.3 },
  ];

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <circle cx="${size/2}" cy="${size/2}" r="${size * 0.48}" fill="${p.bg}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${size * 0.44}" fill="none" stroke="${p.accent}" stroke-width="1" opacity="0.2" stroke-dasharray="3 2"/>

      <!-- Sparkles -->
      ${sparkles.map((sp, i) => `
        <circle cx="${sp.x}" cy="${sp.y}" r="${s*0.015}" fill="${p.accent}" opacity="${0.4 + i*0.1}"/>
      `).join('')}

      <!-- BODY -->
      <ellipse cx="${cx}" cy="${size * 0.86}" rx="${s*0.22}" ry="${s*0.16}" fill="${p.dress}"/>
      <ellipse cx="${cx}" cy="${size * 0.83}" rx="${s*0.18}" ry="${s*0.1}" fill="${p.dressLight}" opacity="0.5"/>

      <rect x="${cx - s*0.055}" y="${size * 0.6}" width="${s*0.11}" height="${s*0.1}" fill="${p.skin}" rx="3"/>
      <ellipse cx="${cx - s*0.13}" cy="${size * 0.72}" rx="${s*0.07}" ry="${s*0.05}" fill="${p.skin}"/>
      <ellipse cx="${cx + s*0.13}" cy="${size * 0.72}" rx="${s*0.07}" ry="${s*0.05}" fill="${p.skin}"/>
      <ellipse cx="${cx - s*0.23}" cy="${size * 0.78}" rx="${s*0.045}" ry="${s*0.065}" fill="${p.skin}"/>
      <ellipse cx="${cx + s*0.23}" cy="${size * 0.78}" rx="${s*0.045}" ry="${s*0.065}" fill="${p.skin}"/>
      <circle cx="${cx - s*0.23}" cy="${size * 0.84}" r="${s*0.03}" fill="${p.skin}"/>
      <circle cx="${cx + s*0.23}" cy="${size * 0.84}" r="${s*0.03}" fill="${p.skin}"/>

      <!-- Collar bow -->
      <path d="M ${cx - s*0.1} ${size * 0.68} Q ${cx} ${size * 0.65} ${cx + s*0.1} ${size * 0.68}" stroke="white" stroke-width="3" fill="none" opacity="0.8"/>
      <ellipse cx="${cx - s*0.04}" cy="${size * 0.69}" rx="${s*0.035}" ry="${s*0.02}" fill="${p.accent}"/>
      <ellipse cx="${cx + s*0.04}" cy="${size * 0.69}" rx="${s*0.035}" ry="${s*0.02}" fill="${p.accent}"/>
      <circle cx="${cx}" cy="${size * 0.69}" r="${s*0.015}" fill="${p.accent}"/>

      <!-- HAIR back -->
      ${hairStyle(cx, cy, s, p)}

      <!-- HEAD -->
      <ellipse cx="${cx}" cy="${cy}" rx="${s*0.27}" ry="${s*0.25}" fill="${p.skin}"/>
      <ellipse cx="${cx - s*0.08}" cy="${cy - s*0.08}" rx="${s*0.1}" ry="${s*0.08}" fill="white" opacity="0.1"/>

      <!-- Blush -->
      <ellipse cx="${cx - s*0.15}" cy="${cy + s*0.06}" rx="${s*0.05}" ry="${s*0.025}" fill="${p.skinBlush}" opacity="0.4"/>
      <ellipse cx="${cx + s*0.15}" cy="${cy + s*0.06}" rx="${s*0.05}" ry="${s*0.025}" fill="${p.skinBlush}" opacity="0.4"/>

      <!-- EYES -->
      <ellipse cx="${cx - s*0.095}" cy="${cy - s*0.01}" rx="${s*0.065}" ry="${s*0.075}" fill="#FFFFFF"/>
      <ellipse cx="${cx - s*0.095}" cy="${cy + s*0.005}" rx="${s*0.052}" ry="${s*0.062}" fill="${p.eye}"/>
      <ellipse cx="${cx - s*0.095}" cy="${cy + s*0.02}" rx="${s*0.025}" ry="${s*0.035}" fill="#1a1a1a"/>
      <ellipse cx="${cx - s*0.115}" cy="${cy - s*0.025}" rx="${s*0.022}" ry="${s*0.028}" fill="white"/>
      <circle cx="${cx - s*0.07}" cy="${cy + s*0.035}" r="${s*0.01}" fill="white" opacity="0.8"/>

      <ellipse cx="${cx + s*0.095}" cy="${cy - s*0.01}" rx="${s*0.065}" ry="${s*0.075}" fill="#FFFFFF"/>
      <ellipse cx="${cx + s*0.095}" cy="${cy + s*0.005}" rx="${s*0.052}" ry="${s*0.062}" fill="${p.eye}"/>
      <ellipse cx="${cx + s*0.095}" cy="${cy + s*0.02}" rx="${s*0.025}" ry="${s*0.035}" fill="#1a1a1a"/>
      <ellipse cx="${cx + s*0.075}" cy="${cy - s*0.025}" rx="${s*0.022}" ry="${s*0.028}" fill="white"/>
      <circle cx="${cx + s*0.12}" cy="${cy + s*0.035}" r="${s*0.01}" fill="white" opacity="0.8"/>

      <!-- Nose -->
      <ellipse cx="${cx}" cy="${cy + s*0.055}" rx="${s*0.01}" ry="${s*0.007}" fill="#E8C4B8" opacity="0.4"/>

      <!-- Smile -->
      <path d="M ${cx - s*0.055} ${cy + s*0.1} Q ${cx} ${cy + s*0.17} ${cx + s*0.055} ${cy + s*0.1}"
            stroke="#D06060" stroke-width="1.5" fill="#FFCCCC" stroke-linecap="round"/>
      <ellipse cx="${cx}" cy="${cy + s*0.13}" rx="${s*0.02}" ry="${s*0.015}" fill="#FF8080" opacity="0.6"/>

      <!-- BANGS -->
      <path d="M ${cx - s*0.24} ${cy - s*0.18}
               Q ${cx - s*0.1} ${cy - s*0.08} ${cx} ${cy - s*0.12}
               Q ${cx + s*0.1} ${cy - s*0.08} ${cx + s*0.24} ${cy - s*0.18}
               Q ${cx + s*0.1} ${cy - s*0.28} ${cx} ${cy - s*0.3}
               Q ${cx - s*0.1} ${cy - s*0.28} ${cx - s*0.24} ${cy - s*0.18}"
            fill="${p.hair}"/>
      <path d="M ${cx - s*0.16} ${cy - s*0.24} Q ${cx - s*0.13} ${cy - s*0.16} ${cx - s*0.11} ${cy - s*0.13}"
            stroke="${p.hairLight}" stroke-width="2.5" fill="none" opacity="0.7" stroke-linecap="round"/>
      <path d="M ${cx + s*0.11} ${cy - s*0.25} Q ${cx + s*0.09} ${cy - s*0.18} ${cx + s*0.07} ${cy - s*0.14}"
            stroke="${p.hairLight}" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"/>

      <!-- Accessory -->
      ${accessory(cx, cy, s, p)}
    </svg>
  `.trim();
}

// Modal component using Portal to avoid button nesting
function AvatarModal({ name, onClose }) {
  const largeSvg = generateAvatarSvg(name, 240);
  const largeDataUrl = `data:image/svg+xml,${encodeURIComponent(largeSvg)}`;

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-md"
      onClick={onClose}
    >
      <div className="relative" onClick={e => e.stopPropagation()}>
        <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 via-accent-500/20 to-brand-500/20 rounded-full blur-xl" />
        <img
          src={largeDataUrl}
          alt={`${name}'s avatar`}
          width={240}
          height={240}
          className="relative rounded-full shadow-2xl ring-4 ring-white/20"
        />
        <div
          onClick={onClose}
          className="absolute -top-2 -right-2 w-8 h-8 bg-dark-card rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500/50 transition-colors shadow-lg cursor-pointer"
        >
          ×
        </div>
        <p className="text-center mt-6 text-white font-medium text-lg">{name || 'User'}</p>
        <p className="text-center text-gray-400 text-sm">Click anywhere to close</p>
      </div>
    </div>,
    document.body
  );
}

export function Avatar({ name, size = 44, className = '' }) {
  const [showLarge, setShowLarge] = useState(false);
  const [mounted, setMounted] = useState(false);
  const svg = generateAvatarSvg(name, size);
  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <img
        src={dataUrl}
        alt={`${name || 'User'}'s avatar`}
        width={size}
        height={size}
        className={`rounded-full cursor-pointer hover:ring-2 hover:ring-brand-400/50 hover:scale-105 transition-all ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setShowLarge(true);
        }}
      />
      {mounted && showLarge && <AvatarModal name={name} onClose={() => setShowLarge(false)} />}
    </>
  );
}

export default Avatar;
