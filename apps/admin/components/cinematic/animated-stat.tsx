'use client';

import { motion } from 'framer-motion';
import CountUp from './count-up';

interface AnimatedStatProps {
  title: string;
  count: number | string;
  delay?: number;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
}

export default function AnimatedStat({ title, count, delay = 0, prefix = '', suffix = '', icon }: AnimatedStatProps) {
  const isNumber = typeof count === 'number';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay }}
      className="relative group backdrop-blur-xl bg-gradient-to-br from-purple-900/40 to-black/60 border border-purple-500/40 rounded-xl p-6 overflow-hidden hover:border-cyan-400/60 transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 via-transparent to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <small className="text-xs uppercase tracking-widest text-purple-200/80">{title}</small>
          {icon && <div className="text-cyan-400">{icon}</div>}
        </div>
        <strong className="text-4xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">
          {isNumber ? <CountUp end={count} prefix={prefix} suffix={suffix} /> : count}
        </strong>
      </div>
    </motion.div>
  );
}
