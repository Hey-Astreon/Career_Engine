"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  size: number;
  left: number; // percentage
  top: number; // percentage
  duration: number;
  delay: number;
  color: string;
  glow: boolean;
  driftX: number;
  floatY: number;
}

export default function DataDustBackground() {
  const [mounted, setMounted] = useState(false);

  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colors = [
      "rgba(0, 113, 227, 0.65)", // Apple Blue
      "rgba(14, 165, 233, 0.6)",  // Sky Blue
      "rgba(99, 102, 241, 0.55)", // Indigo
      "rgba(0, 113, 227, 0.85)", // Vivid Accent Blue
      "rgba(56, 189, 248, 0.7)",  // Cyan-blue
    ];

    const generated = Array.from({ length: 55 }).map((_, i) => {
      const isBeacon = i % 8 === 0;
      const size = isBeacon ? 5.5 : Math.random() * 2.5 + 2.5;
      const left = Math.random() * 96 + 2;
      const top = Math.random() * 90 + 5;
      const duration = Math.random() * 12 + 10;
      const delay = Math.random() * -20;
      const color = colors[i % colors.length];
      const glow = isBeacon || Math.random() > 0.5;
      const driftX = (Math.random() - 0.5) * 40;
      const floatY = -(Math.random() * 140 + 80);

      return {
        id: i,
        size,
        left,
        top,
        duration,
        delay,
        color,
        glow,
        driftX,
        floatY,
      };
    });
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticles(generated);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Subtle background mesh gradient accent */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(0, 113, 227, 0.08), transparent 70%)",
        }}
      />

      {/* Floating particles */}
      <div 
        className="absolute inset-0"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)"
        }}
      >
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.left}%`,
              top: `${p.top}%`,
              backgroundColor: p.color,
              boxShadow: p.glow 
                ? `0 0 ${p.size * 2}px ${p.color}, 0 0 ${p.size * 3.5}px rgba(0, 113, 227, 0.3)` 
                : undefined,
              willChange: "transform, opacity",
            }}
            animate={{
              y: [0, p.floatY * 0.5, p.floatY],
              x: [0, p.driftX, 0],
              opacity: [0.15, 0.85, 0.9, 0.15],
              scale: [0.85, 1.15, 0.9],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay,
            }}
          />
        ))}
      </div>
    </div>
  );
}
