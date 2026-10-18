'use client';

import { motion } from 'framer-motion';

export default function ScanningLine() {
  return (
    <motion.div
      className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
      animate={{ y: ['0%', '100%'] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    />
  );
}
