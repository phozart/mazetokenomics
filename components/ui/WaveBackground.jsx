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
      time += 0.005; // Much slower movement
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Flowing color waves - very subtle and blurry
      const waves = [
        {
          baseX: canvas.width * 0.2,
          baseY: canvas.height * 0.3,
          color: 'rgba(139, 92, 246, 0.04)',  // purple - very faint
          size: Math.max(canvas.width, canvas.height) * 0.9,
          speed: 0.3,
          xWave: 0.2,
          yWave: 0.15,
        },
        {
          baseX: canvas.width * 0.7,
          baseY: canvas.height * 0.5,
          color: 'rgba(167, 139, 250, 0.03)',  // light purple - very faint
          size: Math.max(canvas.width, canvas.height) * 0.8,
          speed: 0.25,
          xWave: 0.18,
          yWave: 0.2,
        },
        {
          baseX: canvas.width * 0.8,
          baseY: canvas.height * 0.7,
          color: 'rgba(6, 182, 212, 0.035)',   // cyan - very faint
          size: Math.max(canvas.width, canvas.height) * 0.85,
          speed: 0.35,
          xWave: 0.22,
          yWave: 0.18,
        },
        {
          baseX: canvas.width * 0.3,
          baseY: canvas.height * 0.8,
          color: 'rgba(109, 40, 217, 0.03)',  // deep purple - very faint
          size: Math.max(canvas.width, canvas.height) * 0.75,
          speed: 0.2,
          xWave: 0.15,
          yWave: 0.18,
        },
        {
          baseX: canvas.width * 0.5,
          baseY: canvas.height * 0.2,
          color: 'rgba(34, 211, 238, 0.025)',  // light cyan - very faint
          size: Math.max(canvas.width, canvas.height) * 0.7,
          speed: 0.4,
          xWave: 0.18,
          yWave: 0.2,
        },
      ];

      waves.forEach((wave) => {
        const x = wave.baseX + Math.sin(time * wave.speed) * canvas.width * wave.xWave;
        const y = wave.baseY + Math.cos(time * wave.speed * 0.7) * canvas.height * wave.yWave;
        const size = wave.size * (1 + Math.sin(time * wave.speed * 0.5) * 0.15);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, wave.color);
        gradient.addColorStop(0.3, wave.color.replace(/[\d.]+\)$/, '0.02)'));
        gradient.addColorStop(0.6, wave.color.replace(/[\d.]+\)$/, '0.01)'));
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
      style={{ zIndex: 0 }}
    />
  );
}
