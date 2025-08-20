// Performance monitoring and optimization utilities

interface PerformanceMetrics {
  pageLoad: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay?: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Observe Core Web Vitals
    try {
      // LCP Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.largestContentfulPaint = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // FID Observer
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as any; // PerformanceEventTiming
          this.metrics.firstInputDelay = fidEntry.processingStart - fidEntry.startTime;
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // CLS Observer
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.metrics.cumulativeLayoutShift = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }

    // Page load metrics
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      this.metrics.pageLoad = navigation.loadEventEnd - navigation.fetchStart;
      
      // FCP
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.metrics.firstContentfulPaint = fcpEntry.startTime;
      }
    });
  }

  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  // Send metrics to monitoring service
  async reportMetrics() {
    if (!import.meta.env.PROD) return;

    try {
      await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: window.location.pathname,
          userAgent: navigator.userAgent,
          connection: (navigator as any).connection?.effectiveType,
          metrics: this.metrics,
          timestamp: Date.now()
        })
      });
    } catch {
      // Silently fail
    }
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Image lazy loading utility
export const setupLazyLoading = () => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
};

// Bundle preloading for critical routes
export const preloadRoute = (routeName: string) => {
  const routeMap: Record<string, string> = {
    analytics: '/src/pages/Analytics.tsx',
    clients: '/src/pages/Clients.tsx',
    bookings: '/src/pages/Bookings.tsx',
    requests: '/src/pages/Requests.tsx'
  };

  const modulePath = routeMap[routeName];
  if (modulePath) {
    import(/* @vite-ignore */ modulePath).catch(() => {
      // Silently fail if preload doesn't work
    });
  }
};

// Memory usage monitoring
export const monitorMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const usage = {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
    };

    if (usage.used > usage.limit * 0.8) {
      console.warn('High memory usage detected:', usage);
    }

    return usage;
  }
  return null;
};

export const performanceMonitor = new PerformanceMonitor();

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Report metrics after 5 seconds
  setTimeout(() => {
    performanceMonitor.reportMetrics();
  }, 5000);

  // Setup lazy loading
  setupLazyLoading();
}