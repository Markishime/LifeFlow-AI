'use client';

import { useEffect, useState } from 'react';

interface TypingEffectProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
}

export default function TypingEffect({ text, delay = 500, speed = 80, className = '' }: TypingEffectProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started || currentIndex >= text.length) return;
    const timer = setTimeout(() => {
      setDisplayText((prev) => prev + text[currentIndex]);
      setCurrentIndex((prev) => prev + 1);
    }, speed);
    return () => clearTimeout(timer);
  }, [started, currentIndex, text, speed]);

  return (
    <span className={`inline-block ${className}`}>
      {displayText}
      {started && currentIndex < text.length && (
        <span className="inline-block w-0.5 h-6 bg-cyan-400 ml-1 animate-pulse" />
      )}
    </span>
  );
}
