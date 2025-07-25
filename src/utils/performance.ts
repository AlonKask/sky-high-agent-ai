// Performance optimization utilities

import { lazy, ComponentType } from 'react';

// Lazy loading utility with better error handling
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: ComponentType
) {
  const Component = lazy(importFunc);
  
  return Component;
}

// Image optimization utility
export function optimizeImageSrc(src: string, width?: number, quality = 85): string {
  if (!src) return '';
  
  // For external images, return as is
  if (src.startsWith('http')) {
    return src;
  }
  
  // For local images, add optimization parameters
  const url = new URL(src, window.location.origin);
  if (width) {
    url.searchParams.set('w', width.toString());
  }
  url.searchParams.set('q', quality.toString());
  
  return url.toString();
}

// Performance monitoring
export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();
  
  static mark(name: string) {
    this.marks.set(name, performance.now());
  }
  
  static measure(name: string, startMark: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) {
      console.warn(`Start mark "${startMark}" not found`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    
    // Log slow operations in development
    if (import.meta.env.DEV && duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  static clear() {
    this.marks.clear();
  }
}

// Debounce utility for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

// Throttle utility for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}