#!/usr/bin/env node
/**
 * Generate PNG icons from SVG for PWA and iOS support
 * Run: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SVG_PATH = path.join(PUBLIC_DIR, 'icon.svg');

// Icon sizes needed for PWA and iOS
const SIZES = [
  { size: 180, name: 'apple-touch-icon.png' },  // iOS home screen
  { size: 192, name: 'icon-192.png' },           // Android/PWA
  { size: 512, name: 'icon-512.png' },           // Android/PWA splash
  { size: 32, name: 'favicon-32x32.png' },       // Browser tab
  { size: 16, name: 'favicon-16x16.png' },       // Browser tab small
];

async function generateIcons() {
  console.log('Generating PNG icons from SVG...\n');

  // Read SVG file
  const svgBuffer = fs.readFileSync(SVG_PATH);

  for (const { size, name } of SIZES) {
    const outputPath = path.join(PUBLIC_DIR, name);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  Created: ${name} (${size}x${size})`);
  }

  console.log('\nDone! Icons generated in public/ folder.');
  console.log('\nMake sure to rebuild and redeploy your app.');
}

generateIcons().catch(console.error);
