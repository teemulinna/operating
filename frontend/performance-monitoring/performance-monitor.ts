// Performance Monitoring Suite for App.tsx Refactoring
import { performance, PerformanceObserver } from 'perf_hooks';

export interface PerformanceMetrics {
  buildTime: number;
  bundleSize: {
    total: number;
    chunks: Record<string, number>;
  };
  runtime: {
    fcp: number;
    tti: number;
    lcp: number;
    cls: number;
    fid: number;
  };
  memory: {
    used: number;
    total: number;
    external: number;
  };
  networkRequests: {
    total: number;
    avgResponseTime: number;
    failureRate: number;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    buildTime: 0,
    bundleSize: { total: 0, chunks: {} },
    runtime: { fcp: 0, tti: 0, lcp: 0, cls: 0, fid: 0 },
    memory: { used: 0, total: 0, external: 0 },
    networkRequests: { total: 0, avgResponseTime: 0, failureRate: 0 }
  };

  private observers: PerformanceObserver[] = [];

  constructor() {
    this.setupObservers();
  }

  private setupObservers() {
    // Core Web Vitals Observer
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      try {
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('Performance Observer not fully supported:', e);
      }
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry) {
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.metrics.runtime.fcp = entry.startTime;
        }
        break;
      case 'largest-contentful-paint':
        this.metrics.runtime.lcp = (entry as any).startTime;
        break;
      case 'first-input':
        this.metrics.runtime.fid = (entry as any).processingStart - entry.startTime;
        break;
      case 'layout-shift':
        this.metrics.runtime.cls += (entry as any).value;
        break;
    }
  }

  // Measure bundle sizes after build
  async measureBundleSize(distPath: string): Promise<void> {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    
    try {
      const files = await fs.readdir(distPath, { recursive: true });
      let totalSize = 0;
      const chunks: Record<string, number> = {};

      for (const file of files) {
        if (typeof file === 'string' && (file.endsWith('.js') || file.endsWith('.css'))) {
          const filePath = path.join(distPath, file);
          const stat = await fs.stat(filePath);
          const size = stat.size;
          
          totalSize += size;
          chunks[file] = size;
        }
      }

      this.metrics.bundleSize = { total: totalSize, chunks };
    } catch (error) {
      console.error('Error measuring bundle size:', error);
    }
  }

  // Measure memory usage
  measureMemoryUsage(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memory = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        external: memory.usedJSHeapSize
      };
    } else if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      this.metrics.memory = {
        used: memory.heapUsed,
        total: memory.heapTotal,
        external: memory.external
      };
    }
  }

  // Track network requests
  trackNetworkRequest(url: string, responseTime: number, success: boolean): void {
    this.metrics.networkRequests.total++;
    this.metrics.networkRequests.avgResponseTime = 
      (this.metrics.networkRequests.avgResponseTime * (this.metrics.networkRequests.total - 1) + responseTime) / 
      this.metrics.networkRequests.total;
    
    if (!success) {
      this.metrics.networkRequests.failureRate = 
        (this.metrics.networkRequests.failureRate * (this.metrics.networkRequests.total - 1) + 1) / 
        this.metrics.networkRequests.total;
    } else {
      this.metrics.networkRequests.failureRate = 
        (this.metrics.networkRequests.failureRate * (this.metrics.networkRequests.total - 1)) / 
        this.metrics.networkRequests.total;
    }
  }

  // Calculate Time to Interactive (TTI)
  calculateTTI(): void {
    if (typeof window !== 'undefined') {
      // Simplified TTI calculation - when the page is fully loaded and interactive
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      this.metrics.runtime.tti = loadTime;
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    this.measureMemoryUsage();
    return { ...this.metrics };
  }

  // Compare metrics with baseline
  compareWithBaseline(baseline: PerformanceMetrics): {
    bundleSizeChange: number;
    performanceRegression: boolean;
    memoryIncrease: number;
    summary: string;
  } {
    const bundleSizeChange = ((this.metrics.bundleSize.total - baseline.bundleSize.total) / baseline.bundleSize.total) * 100;
    const fcpChange = ((this.metrics.runtime.fcp - baseline.runtime.fcp) / baseline.runtime.fcp) * 100;
    const memoryChange = ((this.metrics.memory.used - baseline.memory.used) / baseline.memory.used) * 100;
    
    const performanceRegression = fcpChange > 20 || this.metrics.runtime.tti - baseline.runtime.tti > 500;
    
    const summary = `Bundle Size: ${bundleSizeChange.toFixed(1)}%, FCP: ${fcpChange.toFixed(1)}%, Memory: ${memoryChange.toFixed(1)}%`;
    
    return {
      bundleSizeChange,
      performanceRegression,
      memoryIncrease: memoryChange,
      summary
    };
  }

  // Save metrics to file
  async saveMetrics(filename: string): Promise<void> {
    const fs = await import('fs').then(m => m.promises);
    const metrics = this.getMetrics();
    
    try {
      await fs.writeFile(
        filename, 
        JSON.stringify(metrics, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  // Load baseline metrics
  async loadBaseline(filename: string): Promise<PerformanceMetrics | null> {
    const fs = await import('fs').then(m => m.promises);
    
    try {
      const data = await fs.readFile(filename, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading baseline:', error);
      return null;
    }
  }

  // Generate performance report
  generateReport(baseline?: PerformanceMetrics): string {
    const current = this.getMetrics();
    let report = '# Performance Report\n\n';
    
    report += `## Current Metrics\n`;
    report += `- Bundle Size: ${(current.bundleSize.total / 1024).toFixed(2)} KB\n`;
    report += `- First Contentful Paint: ${current.runtime.fcp.toFixed(2)}ms\n`;
    report += `- Time to Interactive: ${current.runtime.tti.toFixed(2)}ms\n`;
    report += `- Memory Usage: ${(current.memory.used / 1024 / 1024).toFixed(2)} MB\n`;
    report += `- Network Requests: ${current.networkRequests.total}\n`;
    report += `- Average Response Time: ${current.networkRequests.avgResponseTime.toFixed(2)}ms\n\n`;

    if (baseline) {
      const comparison = this.compareWithBaseline(baseline);
      report += `## Comparison with Baseline\n`;
      report += `${comparison.summary}\n`;
      
      if (comparison.performanceRegression) {
        report += `⚠️  **PERFORMANCE REGRESSION DETECTED**\n`;
      } else {
        report += `✅ Performance within acceptable range\n`;
      }
      report += '\n';
    }

    report += `## Bundle Analysis\n`;
    Object.entries(current.bundleSize.chunks).forEach(([chunk, size]) => {
      report += `- ${chunk}: ${(size / 1024).toFixed(2)} KB\n`;
    });

    return report;
  }

  // Cleanup observers
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for component-level performance monitoring
export function usePerformanceMonitor() {
  return {
    measureComponentRender: (componentName: string) => {
      const startTime = Date.now();
      return () => {
        const endTime = Date.now();
        console.log(`${componentName} render time: ${endTime - startTime}ms`);
      };
    },
    trackNavigation: (route: string) => {
      performanceMonitor.trackNetworkRequest(route, Date.now(), true);
    },
    getCurrentMetrics: () => performanceMonitor.getMetrics()
  };
}