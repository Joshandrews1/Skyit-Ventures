import React, { useEffect, useState, useRef } from 'react';

interface AnimatedStatCounterProps {
  target: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  formatComma?: boolean;
  secondTarget?: number;
}

export const AnimatedStatCounter: React.FC<AnimatedStatCounterProps> = ({
  target,
  decimals = 0,
  duration = 2000,
  prefix = '',
  suffix = '',
  formatComma = false,
  secondTarget,
}) => {
  const [currentVal, setCurrentVal] = useState(0);
  const [secondVal, setSecondVal] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Fallback if IntersectionObserver is unavailable or instantly trigger
    if (!('IntersectionObserver' in window)) {
      setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasAnimated) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutCubic for smooth fast start and soft settle
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setCurrentVal(easeProgress * target);
      if (secondTarget !== undefined) {
        setSecondVal(easeProgress * secondTarget);
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [hasAnimated, target, secondTarget, duration]);

  const formatNumber = (val: number, dec: number) => {
    const fixed = val.toFixed(dec);
    if (formatComma) {
      const parts = fixed.split('.');
      parts[0] = parseInt(parts[0] || '0', 10).toLocaleString('en-US');
      return parts.join('.');
    }
    return fixed;
  };

  const formattedMain = formatNumber(currentVal, decimals);
  const formattedSecond = secondTarget !== undefined ? formatNumber(secondVal, 0) : null;

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {formattedMain}
      {formattedSecond !== null ? `/${formattedSecond}` : ''}
      {suffix}
    </span>
  );
};
