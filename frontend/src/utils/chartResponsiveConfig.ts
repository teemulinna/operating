import { useEffect, useState } from 'react';

// Breakpoints for responsive behavior
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// Hook to get current screen size
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState<Breakpoint>('lg');
  const [width, setWidth] = useState<number>(1024);

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      setWidth(width);
      
      if (width >= BREAKPOINTS['2xl']) setScreenSize('2xl');
      else if (width >= BREAKPOINTS.xl) setScreenSize('xl');
      else if (width >= BREAKPOINTS.lg) setScreenSize('lg');
      else if (width >= BREAKPOINTS.md) setScreenSize('md');
      else if (width >= BREAKPOINTS.sm) setScreenSize('sm');
      else setScreenSize('xs');
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return { screenSize, width };
};

// Responsive chart configurations
export interface ResponsiveChartConfig {
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fontSize: number;
  showLabels: boolean;
  showLegend: boolean;
  tickSize: number;
  strokeWidth: number;
  barSize?: number;
  outerRadius?: number;
  labelStyle: {
    fontSize: number;
    fontWeight: string;
  };
}

export const getResponsiveChartConfig = (screenSize: Breakpoint, chartType: 'bar' | 'line' | 'pie' = 'bar'): ResponsiveChartConfig => {
  const baseConfig: ResponsiveChartConfig = {
    height: 400,
    margin: { top: 20, right: 30, bottom: 20, left: 40 },
    fontSize: 12,
    showLabels: true,
    showLegend: true,
    tickSize: 6,
    strokeWidth: 2,
    barSize: undefined,
    outerRadius: 80,
    labelStyle: {
      fontSize: 12,
      fontWeight: '500'
    }
  };

  switch (screenSize) {
    case 'xs':
    case 'sm':
      return {
        ...baseConfig,
        height: chartType === 'pie' ? 250 : 280,
        margin: { top: 10, right: 10, bottom: 30, left: 20 },
        fontSize: 10,
        showLabels: chartType !== 'bar', // Hide labels on small bar charts
        showLegend: chartType === 'pie',
        tickSize: 4,
        strokeWidth: 1.5,
        barSize: chartType === 'bar' ? 20 : undefined,
        outerRadius: chartType === 'pie' ? 60 : 80,
        labelStyle: {
          fontSize: 10,
          fontWeight: '400'
        }
      };
    
    case 'md':
      return {
        ...baseConfig,
        height: chartType === 'pie' ? 300 : 350,
        margin: { top: 15, right: 20, bottom: 25, left: 30 },
        fontSize: 11,
        showLabels: true,
        showLegend: true,
        tickSize: 5,
        strokeWidth: 2,
        barSize: chartType === 'bar' ? 25 : undefined,
        outerRadius: chartType === 'pie' ? 70 : 80,
        labelStyle: {
          fontSize: 11,
          fontWeight: '500'
        }
      };
    
    case 'lg':
    case 'xl':
    case '2xl':
    default:
      return {
        ...baseConfig,
        height: chartType === 'pie' ? 400 : 400,
        margin: { top: 20, right: 30, bottom: 20, left: 40 },
        fontSize: 12,
        showLabels: true,
        showLegend: true,
        tickSize: 6,
        strokeWidth: 2,
        barSize: undefined,
        outerRadius: chartType === 'pie' ? 80 : 80,
        labelStyle: {
          fontSize: 12,
          fontWeight: '500'
        }
      };
  }
};

// Responsive container query support
export const useContainerQuery = (ref: React.RefObject<HTMLElement>) => {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    resizeObserver.observe(ref.current);
    
    return () => resizeObserver.disconnect();
  }, [ref]);
  
  const getContainerSize = (): Breakpoint => {
    if (containerWidth >= 1280) return 'xl';
    if (containerWidth >= 1024) return 'lg';
    if (containerWidth >= 768) return 'md';
    if (containerWidth >= 640) return 'sm';
    return 'xs';
  };
  
  return { containerWidth, containerSize: getContainerSize() };
};

// Touch-friendly chart interactions
export const getTouchFriendlyProps = (screenSize: Breakpoint) => {
  const isMobile = screenSize === 'xs' || screenSize === 'sm';
  
  return {
    cursor: isMobile ? 'pointer' : 'default',
    stroke: isMobile ? '#333' : '#666',
    strokeWidth: isMobile ? 2 : 1,
    activeDot: isMobile ? { r: 6, strokeWidth: 2 } : { r: 4, strokeWidth: 1 },
    dot: isMobile ? { r: 4 } : { r: 3 },
    ...(isMobile && {
      onTouchStart: (e: TouchEvent) => e.preventDefault(),
      style: {
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        KhtmlUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent'
      }
    })
  };
};

// Adaptive data density for mobile
export const adaptDataForMobile = <T extends Record<string, any>>(
  data: T[], 
  screenSize: Breakpoint,
  maxPoints: number = 10
): T[] => {
  if (screenSize !== 'xs' && screenSize !== 'sm') return data;
  
  if (data.length <= maxPoints) return data;
  
  // For mobile, show every nth point to reduce density
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
};

// Custom tooltip for mobile
export const getMobileTooltipConfig = (screenSize: Breakpoint) => {
  const isMobile = screenSize === 'xs' || screenSize === 'sm';
  
  return {
    contentStyle: {
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      fontSize: isMobile ? '12px' : '14px',
      padding: isMobile ? '8px' : '10px',
      maxWidth: isMobile ? '200px' : '300px',
      wordWrap: 'break-word' as const
    },
    labelStyle: {
      color: 'white',
      fontSize: isMobile ? '11px' : '13px',
      fontWeight: '600'
    },
    itemStyle: {
      color: 'white',
      fontSize: isMobile ? '10px' : '12px'
    },
    cursor: isMobile ? { strokeDasharray: '3 3' } : true,
    allowEscapeViewBox: { x: true, y: true },
    position: isMobile ? 'top' : undefined
  };
};

// Export utility functions
export const chartResponsiveUtils = {
  getResponsiveChartConfig,
  getTouchFriendlyProps,
  adaptDataForMobile,
  getMobileTooltipConfig,
  useScreenSize,
  useContainerQuery
};