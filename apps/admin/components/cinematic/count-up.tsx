'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function CountUp({ end, duration = 2000, prefix = '', suffix = '', className = '' }: CountUpProps) {
  const [count, setCount] = useState(0);
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!countRef.current) return;
    const obj = { value: 0 };
    animate(obj, {
      value: end,
      duration,
      ease: 'outExpo',
      onUpdate: () => {
        setCount(Math.floor(obj.value));
      },
    });
  }, [end, duration]);

  return (
    <span ref={countRef} className={className}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}
