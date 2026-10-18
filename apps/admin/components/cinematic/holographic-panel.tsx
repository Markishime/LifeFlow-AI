'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface HolographicPanelProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function HolographicPanel({ children, className = '', delay = 0 }: HolographicPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, rotateY: -5 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ rotateY: 2, rotateX: 1, scale: 1.01 }}
      className={`relative backdrop-blur-2xl bg-gradient-to-br from-gray-900/80 to-black/80 border border-cyan-400/40 rounded-2xl shadow-[0_0_60px_rgba(34,211,238,0.4),inset_0_0_60px_rgba(34,211,238,0.1)] overflow-hidden ${className}`}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-400/10 via-transparent to-purple-600/10" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" />
      <div className="relative z-10 p-6">{children}</div>
    </motion.div>
  );
}
