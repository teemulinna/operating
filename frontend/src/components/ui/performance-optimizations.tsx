import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FixedSizeList as List } from 'react-window';
import { FixedSizeGrid as Grid } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { LoadingSkeletons } from './LoadingSkeletons';
import { cn } from '@/lib/utils';

// Lazy Loading Components
export const LazyComponent: React.FC<{
  loader: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  props?: any;
  className?: string;
}> = ({ 
  loader, 
  fallback: Fallback = LoadingSkeletons.Skeleton, 
  errorFallback: ErrorFallback,
  props = {},
  className 
}) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadAttemptRef = useRef(0);

  const loadComponent = useCallback(async () => {
    if (Component || loading) return;

    setLoading(true);
    setError(null);
    loadAttemptRef.current += 1;
    const currentAttempt = loadAttemptRef.current;

    try {
      const module = await loader();
      
      // Only set component if this is still the latest attempt
      if (currentAttempt === loadAttemptRef.current) {
        setComponent(() => module.default);
      }
    } catch (err) {
      if (currentAttempt === loadAttemptRef.current) {
        setError(err as Error);
      }
    } finally {
      if (currentAttempt === loadAttemptRef.current) {
        setLoading(false);
      }
    }
  }, [loader, Component, loading]);

  const retry = useCallback(() => {
    setComponent(null);
    setError(null);
    loadComponent();
  }, [loadComponent]);

  if (error && ErrorFallback) {
    return <ErrorFallback error={error} retry={retry} />;
  }

  if (loading || !Component) {
    return (
      <div className={className}>
        <Fallback />
      </div>
    );
  }

  return <Component {...props} className={className} />;
};

// Intersection Observer Based Lazy Loading
export const LazyLoadOnVisible: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
  className?: string;
}> = ({
  children,
  fallback = <LoadingSkeletons.Skeleton className="h-32" />,
  rootMargin = '50px',
  threshold = 0.1,
  triggerOnce = true,
  className
}) => {
  const [ref, isVisible] = useIntersectionObserver({
    rootMargin,
    threshold,
    triggerOnce
  });

  return (
    <div ref={ref} className={className}>
      <AnimatePresence mode="wait">
        {isVisible ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {fallback}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Virtualized List Component
interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (props: { index: number; style: React.CSSProperties; data: T }) => React.ReactNode;
  loadMoreItems?: (startIndex: number, stopIndex: number) => Promise<void>;
  hasNextPage?: boolean;
  isNextPageLoading?: boolean;
  threshold?: number;
  className?: string;
  overscanCount?: number;
}

export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  loadMoreItems,
  hasNextPage = false,
  isNextPageLoading = false,
  threshold = 15,
  className,
  overscanCount = 5
}: VirtualizedListProps<T>) {
  const itemCount = hasNextPage ? items.length + 1 : items.length;
  const isItemLoaded = (index: number) => !hasNextPage || index < items.length;

  const Item = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];

    if (!isItemLoaded(index)) {
      return (
        <div style={style} className="flex items-center justify-center">
          <LoadingSkeletons.Skeleton className="w-full h-full" />
        </div>
      );
    }

    return renderItem({ index, style, data: item });
  };

  if (!loadMoreItems) {
    return (
      <div className={className}>
        <List
          height={height}
          itemCount={itemCount}
          itemSize={itemHeight}
          overscanCount={overscanCount}
        >
          {Item}
        </List>
      </div>
    );
  }

  return (
    <div className={className}>
      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={itemCount}
        loadMoreItems={loadMoreItems}
        threshold={threshold}
      >
        {({ onItemsRendered, ref }) => (
          <List
            ref={ref}
            height={height}
            itemCount={itemCount}
            itemSize={itemHeight}
            onItemsRendered={onItemsRendered}
            overscanCount={overscanCount}
          >
            {Item}
          </List>
        )}
      </InfiniteLoader>
    </div>
  );
}

// Virtualized Grid Component
interface VirtualizedGridProps<T> {
  items: T[];
  height: number;
  width: number;
  rowHeight: number;
  columnWidth: number;
  columnCount: number;
  renderItem: (props: { 
    rowIndex: number; 
    columnIndex: number; 
    style: React.CSSProperties; 
    data: T | undefined;
  }) => React.ReactNode;
  className?: string;
  overscanCount?: number;
}

export function VirtualizedGrid<T>({
  items,
  height,
  width,
  rowHeight,
  columnWidth,
  columnCount,
  renderItem,
  className,
  overscanCount = 5
}: VirtualizedGridProps<T>) {
  const rowCount = Math.ceil(items.length / columnCount);

  const Cell = ({ 
    rowIndex, 
    columnIndex, 
    style 
  }: { 
    rowIndex: number; 
    columnIndex: number; 
    style: React.CSSProperties;
  }) => {
    const itemIndex = rowIndex * columnCount + columnIndex;
    const item = items[itemIndex];

    return renderItem({ rowIndex, columnIndex, style, data: item });
  };

  return (
    <div className={className}>
      <Grid
        height={height}
        width={width}
        rowCount={rowCount}
        columnCount={columnCount}
        rowHeight={rowHeight}
        columnWidth={columnWidth}
        overscanCount={overscanCount}
      >
        {Cell}
      </Grid>
    </div>
  );
}

// Performance Monitoring Hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderTimeRef = useRef<number>(0);
  const mountTimeRef = useRef<number>(0);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    return () => {
      const unmountTime = performance.now() - mountTimeRef.current;
      console.log(`${componentName} was mounted for ${unmountTime.toFixed(2)}ms`);
    };
  }, [componentName]);

  useEffect(() => {
    const renderStart = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStart;
      renderTimeRef.current = renderTime;
      
      if (renderTime > 16) { // More than one frame at 60fps
        console.warn(`${componentName} render took ${renderTime.toFixed(2)}ms (> 16ms)`);
      }
    };
  });

  const logMetrics = useCallback(() => {
    console.log(`${componentName} Performance:`, {
      lastRenderTime: renderTimeRef.current,
      mountTime: mountTimeRef.current
    });
  }, [componentName]);

  return { logMetrics };
};

// Memoized Component Wrapper
export const MemoizedComponent = React.memo(<T extends Record<string, any>>(
  Component: React.ComponentType<T>
) => {
  return React.forwardRef<any, T>((props, ref) => {
    return <Component {...props} ref={ref} />;
  });
});

// Image Lazy Loading with Progressive Enhancement
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  blurHash?: string;
  threshold?: number;
  className?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  blurHash,
  threshold = 0.1,
  className,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const [ref] = useIntersectionObserver({
    threshold,
    triggerOnce: true,
    onIntersect: () => setIsInView(true)
  });

  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setError(true);
    img.src = src;
  }, [isInView, src]);

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      {/* Placeholder */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse">
          {placeholder && (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover filter blur-sm"
            />
          )}
          {blurHash && (
            <div 
              className="w-full h-full"
              style={{ 
                backgroundImage: `url(${blurHash})`,
                backgroundSize: 'cover',
                filter: 'blur(10px)'
              }}
            />
          )}
        </div>
      )}

      {/* Actual Image */}
      {isInView && (
        <motion.img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          {...props}
        />
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="text-gray-500 text-sm">
            Failed to load image
          </div>
        </div>
      )}
    </div>
  );
};

// Bundle Splitting Helper
export const createLazyComponent = <T extends Record<string, any>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  fallback?: React.ComponentType
) => {
  const LazyComponentWrapper = lazy(importFn);
  
  return React.forwardRef<any, T>((props, ref) => (
    <Suspense fallback={fallback ? <fallback /> : <LoadingSkeletons.Skeleton />}>
      <LazyComponentWrapper {...props} ref={ref} />
    </Suspense>
  ));
};

// Debounced Input for Performance
interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onDebouncedChange: (value: string) => void;
  debounceMs?: number;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  onDebouncedChange,
  debounceMs = 300,
  ...props
}) => {
  const [value, setValue] = useState(props.defaultValue || '');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onDebouncedChange(newValue);
    }, debounceMs);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      {...props}
      value={value}
      onChange={handleChange}
    />
  );
};

// Optimized List with Search and Filtering
interface OptimizedListProps<T> {
  items: T[];
  searchFields: (keyof T)[];
  filterFn?: (item: T, filters: Record<string, any>) => boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  searchPlaceholder?: string;
  className?: string;
  onSelectionChange?: (selected: T[]) => void;
}

export function OptimizedList<T extends Record<string, any>>({
  items,
  searchFields,
  filterFn,
  renderItem,
  itemHeight = 80,
  searchPlaceholder = 'Search...',
  className,
  onSelectionChange
}: OptimizedListProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const filteredItems = useMemo(() => {
    let result = items;

    // Apply search
    if (searchTerm) {
      result = result.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply filters
    if (filterFn && Object.keys(filters).length > 0) {
      result = result.filter(item => filterFn(item, filters));
    }

    return result;
  }, [items, searchTerm, filters, searchFields, filterFn]);

  const handleSelectionToggle = useCallback((index: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }

      if (onSelectionChange) {
        const selectedItemsArray = Array.from(newSet).map(i => filteredItems[i]);
        onSelectionChange(selectedItemsArray);
      }

      return newSet;
    });
  }, [filteredItems, onSelectionChange]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search Bar */}
      <div className="p-4 border-b">
        <DebouncedInput
          type="text"
          placeholder={searchPlaceholder}
          onDebouncedChange={setSearchTerm}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Results */}
      <div className="flex-1">
        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            No items found
          </div>
        ) : (
          <VirtualizedList
            items={filteredItems}
            height={400}
            itemHeight={itemHeight}
            renderItem={({ index, style, data }) => (
              <div 
                style={style}
                className={cn(
                  'px-4 py-2 border-b cursor-pointer hover:bg-gray-50',
                  selectedItems.has(index) && 'bg-blue-50'
                )}
                onClick={() => handleSelectionToggle(index)}
              >
                {renderItem(data, index)}
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}

export {
  usePerformanceMonitor,
  createLazyComponent
};