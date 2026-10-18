'use client';

import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface HolographicTextProps {
  text: string;
  className?: string;
}

export default function HolographicText({ text, className = '' }: HolographicTextProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    if (!textRef.current) return;
    const chars = text.split('');
    textRef.current.innerHTML = chars
      .map((char, i) => `<span class="char" data-index="${i}">${char === ' ' ? '&nbsp;' : char}</span>`)
      .join('');

    charsRef.current = Array.from(textRef.current.querySelectorAll('.char'));

    animate(charsRef.current, {
      opacity: [0, 1],
      translateY: [20, 0],
      translateX: [10, 0],
      scale: [0.8, 1],
      rotateY: [15, 0],
      duration: 1200,
      delay: (_el, i) => (i ?? 0) * 30 + 300,
      ease: 'outExpo',
    });

    const interval = setInterval(() => {
      const randomChars = charsRef.current.slice(0, 5);
      animate(randomChars, {
        color: ['#a78bfa', '#f59e0b', '#60a5fa', '#a78bfa'],
        textShadow: [
          '0 0 10px #a78bfa, 0 0 20px #a78bfa',
          '0 0 20px #f59e0b, 0 0 40px #f59e0b',
          '0 0 10px #a78bfa, 0 0 20px #a78bfa',
        ],
        duration: 1000,
        ease: 'inOutQuad',
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <div
      ref={textRef}
      className={`inline-block font-semibold tracking-tight ${className}`}
    />
  );
}
