import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Bolt, Home as HomeIcon, Globe, Leaf, ArrowRight, MapPin, Cpu, Battery, Briefcase, ChevronRight, ChevronLeft, Sparkles, Tag, Percent, Sun, Shield, Layers, Activity } from 'lucide-react';

// Using high-quality, lightweight, and reliable Unsplash CDN images for the home sections bento grid.
// This completely resolves Git sync size/existence issues and significantly accelerates page loading.
const imgCatalog = 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/web%20images%2FUntitled%20design%20(18).png?alt=media&token=1285cc05-6bf0-46c4-aa04-1f642396deb6';
const imgAdvisor = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80';
const imgTracker = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
const imgPackages = 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80';

interface HomeSectionsProps {
  onSelectCategory: (category: string) => void;
  onNavigate: (tab: string) => void;
}

// Custom performant 60fps animated counting component that triggers on scroll view
const AnimatedCounter: React.FC<{
  target: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}> = ({ target, duration = 1500, suffix = '', prefix = '', decimals = 0 }) => {
  const [count, setCount] = useState(0);
  const elementRef = React.useRef<HTMLSpanElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing out quadratic function for beautiful deceleration
      const easeProgress = progress * (2 - progress);
      setCount(easeProgress * target);
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [hasStarted, target, duration]);

  return (
    <span ref={elementRef} className="tabular-nums">
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
};

export const HomeSections: React.FC<HomeSectionsProps> = () => {
  return null;
};

