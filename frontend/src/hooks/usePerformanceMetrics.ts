import { useState, useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentMounts: number;
  rerenders: number;
  memoryUsage?: number;
  bundleSize?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
}

interface PerformanceOptions {
  trackRenders?: boolean;
  trackMemory?: boolean;
  trackWebVitals?: boolean;
  samplingRate?: number;
}

export function usePerformanceMetrics(
  componentName: string,
  options: PerformanceOptions = {}
): PerformanceMetrics {
  const {
    trackRenders = true,
    trackMemory = false,
    trackWebVitals = true,
    samplingRate = 1.0
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentMounts: 0,
    rerenders: 0
  });

  const renderStartTime = useRef<number>(0);
  const mountCount = useRef<number>(0);
  const rerenderCount = useRef<number>(0);
  const initialMount = useRef<boolean>(true);

  // Track component lifecycle
  useEffect(() => {
    if (Math.random() > samplingRate) return;

    if (initialMount.current) {
      mountCount.current += 1;
      initialMount.current = false;
    } else {
      rerenderCount.current += 1;
    }

    if (trackRenders) {
      renderStartTime.current = performance.now();
    }

    setMetrics(prev => ({
      ...prev,
      componentMounts: mountCount.current,
      rerenders: rerenderCount.current
    }));
  });

  // Measure render time
  useEffect(() => {
    if (!trackRenders || renderStartTime.current === 0) return;

    const renderTime = performance.now() - renderStartTime.current;
    
    setMetrics(prev => ({
      ...prev,
      renderTime
    }));

    // Log performance in development
    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  });

  // Track memory usage
  useEffect(() => {
    if (!trackMemory || !(performance as any).memory) return;

    const memoryInfo = (performance as any).memory;
    setMetrics(prev => ({
      ...prev,
      memoryUsage: memoryInfo.usedJSHeapSize / 1024 / 1024 // Convert to MB
    }));
  }, [trackMemory]);

  // Track Web Vitals
  useEffect(() => {
    if (!trackWebVitals) return;

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((entryList) => {
      const fcpEntry = entryList.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        setMetrics(prev => ({
          ...prev,
          firstContentfulPaint: fcpEntry.startTime
        }));
      }
    });
    
    try {
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      // Browser doesn't support this observer
    }

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        setMetrics(prev => ({
          ...prev,
          largestContentfulPaint: lastEntry.startTime
        }));
      }
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // Browser doesn't support this observer
    }

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((entryList) => {
      let clsValue = 0;
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      if (clsValue > 0) {
        setMetrics(prev => ({
          ...prev,
          cumulativeLayoutShift: (prev.cumulativeLayoutShift || 0) + clsValue
        }));
      }
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // Browser doesn't support this observer
    }

    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
    };
  }, [trackWebVitals]);

  return metrics;
}

// Global performance tracking
class PerformanceTracker {
  private static instance: PerformanceTracker;
  private metrics: Map<string, PerformanceMetrics> = new Map();

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  recordMetric(componentName: string, metrics: PerformanceMetrics) {
    this.metrics.set(componentName, metrics);
  }

  getMetrics(): Map<string, PerformanceMetrics> {
    return this.metrics;
  }

  generateReport(): string {
    const report = Array.from(this.metrics.entries())
      .map(([name, metrics]) => {
        return `${name}:
  - Render Time: ${metrics.renderTime.toFixed(2)}ms
  - Mounts: ${metrics.componentMounts}
  - Rerenders: ${metrics.rerenders}
  - Memory: ${metrics.memoryUsage?.toFixed(2) || 'N/A'}MB
  - FCP: ${metrics.firstContentfulPaint?.toFixed(2) || 'N/A'}ms
  - LCP: ${metrics.largestContentfulPaint?.toFixed(2) || 'N/A'}ms
  - CLS: ${metrics.cumulativeLayoutShift?.toFixed(3) || 'N/A'}`;
      })
      .join('\n\n');

    return report;
  }

  clearMetrics() {
    this.metrics.clear();
  }
}

export const performanceTracker = PerformanceTracker.getInstance();