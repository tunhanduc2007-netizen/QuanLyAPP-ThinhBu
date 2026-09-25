import React, { useEffect, useState, useRef } from 'react';
import { formatVND } from '@/domain/finance';

/**
 * NumberTicker (Magic UI inspired)
 * Smoothly animates number transitions using easeOutExpo requestAnimationFrame.
 * Fully supports privacy mode masking (••••••••).
 */
export default function NumberTicker({
  value = 0,
  duration = 900,
  isPrivacy = false,
  formatFn = formatVND,
  className = '',
  style = {}
}) {
  const [displayVal, setDisplayVal] = useState(value);
  const prevValRef = useRef(value);
  const frameRef = useRef(null);

  useEffect(() => {
    if (isPrivacy) return;

    const startVal = prevValRef.current;
    const endVal = Number(value) || 0;
    prevValRef.current = endVal;

    if (startVal === endVal) {
      setDisplayVal(endVal);
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(startVal + (endVal - startVal) * ease);
      setDisplayVal(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayVal(endVal);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration, isPrivacy]);

  if (isPrivacy) {
    return <span className={className} style={style}>••••••••</span>;
  }

  return (
    <span className={className} style={style}>
      {formatFn ? formatFn(displayVal) : displayVal}
    </span>
  );
}
