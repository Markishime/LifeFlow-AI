'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface ParticleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'outline';
}

export default function ParticleButton({ children, onClick, disabled, className = '', variant = 'primary' }: ParticleButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: Date.now() + i,
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 60,
      }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 800);
    }
    onClick?.();
  };

  const baseClasses = variant === 'primary'
    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 shadow-[0_0_30px_rgba(124,58,237,0.6)]'
    : 'backdrop-blur-md bg-white/10 border border-purple-400/50 text-purple-100 hover:bg-white/20 hover:border-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)]';

  return (
    <motion.button
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-xl font-semibold transition-all duration-300 overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed ${baseClasses} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
          animate={{ opacity: 0, scale: 1, x: particle.x, y: particle.y }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute w-1 h-1 bg-white rounded-full pointer-events-none"
          style={{ left: '50%', top: '50%' }}
        />
      ))}
    </motion.button>
  );
}
