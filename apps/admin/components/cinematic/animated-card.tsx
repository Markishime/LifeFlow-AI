'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}

export default function AnimatedCard({ children, className = '', delay = 0, hover = true }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={hover ? { y: -8, scale: 1.02, rotateX: 2, rotateY: 2 } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
      className={`relative backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-purple-500/30 rounded-2xl shadow-[0_0_40px_rgba(168,85,247,0.3),0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-blue-600/10 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
