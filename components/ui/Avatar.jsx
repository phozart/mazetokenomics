'use client';

/**
 * Japanese-style minimalist avatar generator
 * Creates unique, cute SVG avatars based on user name
 */

// Girly pastel color palettes
const PALETTES = [
  { hair: '#F8BBD9', skin: '#FFE4E1', bg: '#E8D5F0' },  // Pink
  { hair: '#D4A5D9', skin: '#FFF0F5', bg: '#E0F0FF' },  // Lavender
  { hair: '#B8C9E8', skin: '#FFEEE6', bg: '#F0E6FF' },  // Periwinkle
  { hair: '#98D9C2', skin: '#FFF5E6', bg: '#FFE6F0' },  // Mint
  { hair: '#F5C6AA', skin: '#FFF0E6', bg: '#E6F0FF' },  // Peach
  { hair: '#C4A8D8', skin: '#FFFAF0', bg: '#E6FFE6' },  // Lilac
  { hair: '#A8D8EA', skin: '#FFF8F0', bg: '#FFE6E6' },  // Sky
  { hair: '#FFB3BA', skin: '#FFF5F0', bg: '#E6E6FF' },  // Rose
];

// Hair styles (SVG paths for different styles)
const HAIR_STYLES = [
  // Long straight
  (cx, cy, size, color) => `
    <ellipse cx="${cx}" cy="${cy - size * 0.1}" rx="${size * 0.42}" ry="${size * 0.35}" fill="${color}"/>
    <ellipse cx="${cx}" cy="${cy + size * 0.15}" rx="${size * 0.35}" ry="${size * 0.28}" fill="${color}"/>
  `,
  // Bob cut
  (cx, cy, size, color) => `
    <ellipse cx="${cx}" cy="${cy}" rx="${size * 0.38}" ry="${size * 0.32}" fill="${color}"/>
    <rect x="${cx - size * 0.38}" y="${cy}" width="${size * 0.76}" height="${size * 0.2}" rx="4" fill="${color}"/>
  `,
  // Pigtails (suggested by dots)
  (cx, cy, size, color) => `
    <ellipse cx="${cx}" cy="${cy - size * 0.05}" rx="${size * 0.36}" ry="${size * 0.3}" fill="${color}"/>
    <circle cx="${cx - size * 0.32}" cy="${cy + size * 0.05}" r="${size * 0.12}" fill="${color}"/>
    <circle cx="${cx + size * 0.32}" cy="${cy + size * 0.05}" r="${size * 0.12}" fill="${color}"/>
  `,
  // Bun
  (cx, cy, size, color) => `
    <ellipse cx="${cx}" cy="${cy}" rx="${size * 0.34}" ry="${size * 0.28}" fill="${color}"/>
    <circle cx="${cx}" cy="${cy - size * 0.32}" r="${size * 0.14}" fill="${color}"/>
  `,
];

// Simple hash function for deterministic randomness
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function generateAvatarSvg(name, size = 40) {
  const hash = simpleHash(name || 'User');
  const palette = PALETTES[hash % PALETTES.length];
  const hairStyle = HAIR_STYLES[(hash >> 4) % HAIR_STYLES.length];

  const cx = size / 2;
  const cy = size / 2;
  const faceSize = size * 0.6;

  // Slight variations based on hash
  const eyeSpacing = 0.15 + (hash % 5) * 0.01;
  const eyeY = -0.05 + (hash % 3) * 0.02;
  const blushOpacity = 0.3 + (hash % 4) * 0.1;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background circle -->
      <circle cx="${cx}" cy="${cy}" r="${size * 0.48}" fill="${palette.bg}"/>

      <!-- Hair back -->
      ${hairStyle(cx, cy, faceSize, palette.hair)}

      <!-- Face -->
      <ellipse cx="${cx}" cy="${cy + size * 0.02}" rx="${faceSize * 0.42}" ry="${faceSize * 0.48}" fill="${palette.skin}"/>

      <!-- Blush -->
      <ellipse cx="${cx - faceSize * 0.22}" cy="${cy + faceSize * 0.12}" rx="${faceSize * 0.1}" ry="${faceSize * 0.06}" fill="#FFB6C1" opacity="${blushOpacity}"/>
      <ellipse cx="${cx + faceSize * 0.22}" cy="${cy + faceSize * 0.12}" rx="${faceSize * 0.1}" ry="${faceSize * 0.06}" fill="#FFB6C1" opacity="${blushOpacity}"/>

      <!-- Eyes (simple dots) -->
      <circle cx="${cx - faceSize * eyeSpacing}" cy="${cy + faceSize * eyeY}" r="${faceSize * 0.05}" fill="#4A4A4A"/>
      <circle cx="${cx + faceSize * eyeSpacing}" cy="${cy + faceSize * eyeY}" r="${faceSize * 0.05}" fill="#4A4A4A"/>

      <!-- Subtle smile -->
      <path d="M ${cx - faceSize * 0.08} ${cy + faceSize * 0.18} Q ${cx} ${cy + faceSize * 0.24} ${cx + faceSize * 0.08} ${cy + faceSize * 0.18}"
            stroke="#9E8E8E" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </svg>
  `.trim();
}

export function Avatar({ name, size = 40, className = '' }) {
  const svg = generateAvatarSvg(name, size);
  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  return (
    <img
      src={dataUrl}
      alt={`${name || 'User'}'s avatar`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}

export default Avatar;
