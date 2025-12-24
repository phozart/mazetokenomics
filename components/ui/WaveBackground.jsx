'use client';

import { useEffect, useRef } from 'react';

export function WaveBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      time += 0.015; // Noticeable flowing movement
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Flowing color waves - subtle glow effect
      const waves = [
        {
          baseX: canvas.width * 0.3,
          baseY: canvas.height * 0.4,
          color: 'rgba(139, 92, 246, 0.08)',  // purple
          size: Math.max(canvas.width, canvas.height) * 0.8,
          speed: 1.2,
          xWave: 0.35,
          yWave: 0.3,
        },
        {
          baseX: canvas.width * 0.7,
          baseY: canvas.height * 0.6,
          color: 'rgba(167, 139, 250, 0.07)',  // light purple
          size: Math.max(canvas.width, canvas.height) * 0.75,
          speed: 0.9,
          xWave: 0.3,
          yWave: 0.35,
        },
        {
          baseX: canvas.width * 0.6,
          baseY: canvas.height * 0.3,
          color: 'rgba(6, 182, 212, 0.10)',   // cyan
          size: Math.max(canvas.width, canvas.height) * 0.8,
          speed: 1.4,
          xWave: 0.4,
          yWave: 0.3,
        },
        {
          baseX: canvas.width * 0.4,
          baseY: canvas.height * 0.7,
          color: 'rgba(34, 211, 238, 0.09)',  // light cyan
          size: Math.max(canvas.width, canvas.height) * 0.7,
          speed: 1.1,
          xWave: 0.35,
          yWave: 0.4,
        },
      ];

      waves.forEach((wave) => {
        const x = wave.baseX + Math.sin(time * wave.speed) * canvas.width * wave.xWave;
        const y = wave.baseY + Math.cos(time * wave.speed * 0.7) * canvas.height * wave.yWave;
        const size = wave.size * (1 + Math.sin(time * wave.speed * 0.5) * 0.15);

        // Extract the base opacity from the color
        const baseOpacity = parseFloat(wave.color.match(/[\d.]+\)$/)[0]);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, wave.color);
        gradient.addColorStop(0.2, wave.color.replace(/[\d.]+\)$/, `${baseOpacity * 0.7})`));
        gradient.addColorStop(0.4, wave.color.replace(/[\d.]+\)$/, `${baseOpacity * 0.4})`));
        gradient.addColorStop(0.7, wave.color.replace(/[\d.]+\)$/, `${baseOpacity * 0.15})`));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
