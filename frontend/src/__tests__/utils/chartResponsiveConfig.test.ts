import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getResponsiveChartConfig, 
  adaptDataForMobile, 
  getMobileTooltipConfig,
  getTouchFriendlyProps,
  BREAKPOINTS 
} from '../../utils/chartResponsiveConfig';

// Mock window.innerWidth
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('chartResponsiveConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getResponsiveChartConfig', () => {
    it('returns mobile-optimized config for xs breakpoint', () => {
      const config = getResponsiveChartConfig('xs', 'bar');
      
      expect(config.height).toBe(280);
      expect(config.fontSize).toBe(10);
      expect(config.showLabels).toBe(false);
      expect(config.barSize).toBe(20);
      expect(config.margin.left).toBe(20);
      expect(config.labelStyle.fontSize).toBe(10);
    });

    it('returns mobile-optimized config for sm breakpoint', () => {
      const config = getResponsiveChartConfig('sm', 'line');
      
      expect(config.height).toBe(280);
      expect(config.fontSize).toBe(10);
      expect(config.strokeWidth).toBe(1.5);
      expect(config.tickSize).toBe(4);
    });

    it('returns tablet config for md breakpoint', () => {
      const config = getResponsiveChartConfig('md', 'pie');
      
      expect(config.height).toBe(300);
      expect(config.fontSize).toBe(11);
      expect(config.outerRadius).toBe(70);
      expect(config.showLabels).toBe(true);
      expect(config.showLegend).toBe(true);
    });

    it('returns desktop config for lg breakpoint', () => {
      const config = getResponsiveChartConfig('lg', 'bar');
      
      expect(config.height).toBe(400);
      expect(config.fontSize).toBe(12);
      expect(config.showLabels).toBe(true);
      expect(config.showLegend).toBe(true);
      expect(config.margin.left).toBe(40);
    });

    it('adjusts pie chart config correctly', () => {
      const mobileConfig = getResponsiveChartConfig('xs', 'pie');
      const desktopConfig = getResponsiveChartConfig('lg', 'pie');
      
      expect(mobileConfig.height).toBe(250);
      expect(mobileConfig.outerRadius).toBe(60);
      expect(mobileConfig.showLegend).toBe(true);
      
      expect(desktopConfig.height).toBe(400);
      expect(desktopConfig.outerRadius).toBe(80);
    });
  });

  describe('adaptDataForMobile', () => {
    const testData = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      value: i * 2,
      label: `Item ${i}`
    }));

    it('returns full data for desktop breakpoints', () => {
      const adapted = adaptDataForMobile(testData, 'lg', 10);
      expect(adapted).toHaveLength(50);
      expect(adapted).toBe(testData);
    });

    it('reduces data points for mobile breakpoints', () => {
      const adapted = adaptDataForMobile(testData, 'xs', 10);
      expect(adapted.length).toBeLessThanOrEqual(10);
      expect(adapted[0]).toEqual(testData[0]);
    });

    it('returns original data if already within limit', () => {
      const smallData = testData.slice(0, 5);
      const adapted = adaptDataForMobile(smallData, 'xs', 10);
      expect(adapted).toHaveLength(5);
      expect(adapted).toBe(smallData);
    });

    it('samples data evenly when reducing', () => {
      const adapted = adaptDataForMobile(testData, 'sm', 5);
      expect(adapted.length).toBeLessThanOrEqual(5);
      
      // Check that sampling is roughly even
      const step = Math.ceil(50 / 5);
      expect(adapted[1]?.id).toBeCloseTo(step, 1);
    });
  });

  describe('getMobileTooltipConfig', () => {
    it('returns mobile-optimized tooltip for xs breakpoint', () => {
      const config = getMobileTooltipConfig('xs');
      
      expect(config.contentStyle.fontSize).toBe('12px');
      expect(config.contentStyle.maxWidth).toBe('200px');
      expect(config.labelStyle.fontSize).toBe('11px');
      expect(config.itemStyle.fontSize).toBe('10px');
      expect(config.position).toBe('top');
    });

    it('returns desktop tooltip for lg breakpoint', () => {
      const config = getMobileTooltipConfig('lg');
      
      expect(config.contentStyle.fontSize).toBe('14px');
      expect(config.contentStyle.maxWidth).toBe('300px');
      expect(config.labelStyle.fontSize).toBe('13px');
      expect(config.itemStyle.fontSize).toBe('12px');
      expect(config.position).toBeUndefined();
    });

    it('includes proper styling for mobile', () => {
      const config = getMobileTooltipConfig('sm');
      
      expect(config.contentStyle.backgroundColor).toBe('rgba(0, 0, 0, 0.9)');
      expect(config.contentStyle.borderRadius).toBe('8px');
      expect(config.contentStyle.wordWrap).toBe('break-word');
      expect(config.cursor).toEqual({ strokeDasharray: '3 3' });
    });
  });

  describe('getTouchFriendlyProps', () => {
    it('returns mobile-optimized touch props for xs breakpoint', () => {
      const props = getTouchFriendlyProps('xs');
      
      expect(props.cursor).toBe('pointer');
      expect(props.strokeWidth).toBe(2);
      expect(props.activeDot).toEqual({ r: 6, strokeWidth: 2 });
      expect(props.dot).toEqual({ r: 4 });
      expect(props.style).toBeDefined();
      expect(props.style?.WebkitTouchCallout).toBe('none');
    });

    it('returns desktop props for lg breakpoint', () => {
      const props = getTouchFriendlyProps('lg');
      
      expect(props.cursor).toBe('default');
      expect(props.strokeWidth).toBe(1);
      expect(props.activeDot).toEqual({ r: 4, strokeWidth: 1 });
      expect(props.dot).toEqual({ r: 3 });
      expect(props.style).toBeUndefined();
    });

    it('includes touch event handlers for mobile', () => {
      const props = getTouchFriendlyProps('sm');
      
      expect(props.onTouchStart).toBeDefined();
      expect(props.style?.userSelect).toBe('none');
      expect(props.style?.WebkitTapHighlightColor).toBe('transparent');
    });
  });

  describe('BREAKPOINTS', () => {
    it('defines correct breakpoint values', () => {
      expect(BREAKPOINTS.xs).toBe(0);
      expect(BREAKPOINTS.sm).toBe(640);
      expect(BREAKPOINTS.md).toBe(768);
      expect(BREAKPOINTS.lg).toBe(1024);
      expect(BREAKPOINTS.xl).toBe(1280);
      expect(BREAKPOINTS['2xl']).toBe(1536);
    });
  });

  describe('chart type variations', () => {
    it('handles different chart types appropriately', () => {
      const barConfig = getResponsiveChartConfig('xs', 'bar');
      const lineConfig = getResponsiveChartConfig('xs', 'line');
      const pieConfig = getResponsiveChartConfig('xs', 'pie');
      
      expect(barConfig.showLabels).toBe(false); // Hidden on mobile bars
      expect(lineConfig.showLabels).toBe(true); // Shown on mobile lines
      expect(pieConfig.showLabels).toBe(true); // Shown on mobile pies
      
      expect(barConfig.barSize).toBe(20);
      expect(lineConfig.barSize).toBeUndefined();
      expect(pieConfig.barSize).toBeUndefined();
      
      expect(pieConfig.height).toBe(250); // Shorter for pie charts
      expect(barConfig.height).toBe(280);
      expect(lineConfig.height).toBe(280);
    });
  });

  describe('margin adjustments', () => {
    it('reduces margins for mobile screens', () => {
      const mobileConfig = getResponsiveChartConfig('xs');
      const desktopConfig = getResponsiveChartConfig('lg');
      
      expect(mobileConfig.margin.left).toBeLessThan(desktopConfig.margin.left);
      expect(mobileConfig.margin.right).toBeLessThan(desktopConfig.margin.right);
      expect(mobileConfig.margin.top).toBeLessThan(desktopConfig.margin.top);
    });

    it('provides adequate space for labels', () => {
      const config = getResponsiveChartConfig('md');
      
      expect(config.margin.bottom).toBeGreaterThanOrEqual(25);
      expect(config.margin.left).toBeGreaterThanOrEqual(30);
    });
  });
});