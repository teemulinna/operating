import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OptimizedEmployeeList } from '@/components/employees/OptimizedEmployeeList';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useDebounce } from '@/hooks/useDebounce';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { Employee } from '@/types/employee';

// Mock large employee dataset
const generateMockEmployees = (count: number): Employee[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    firstName: `Employee${i + 1}`,
    lastName: `LastName${i + 1}`,
    email: `employee${i + 1}@company.com`,
    phone: `555-${String(i + 1).padStart(4, '0')}`,
    department: `Department${(i % 5) + 1}`,
    position: `Position${(i % 10) + 1}`,
    salary: 50000 + (i * 1000),
    startDate: '2023-01-01',
    status: 'active' as const,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  }));
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Performance Optimizations', () => {
  describe('Debouncing', () => {
    it('should debounce search input with 300ms delay', async () => {
      let debouncedValue = '';
      
      const TestComponent = () => {
        const [value, setValue] = React.useState('');
        const debounced = useDebounce(value, 300);
        
        React.useEffect(() => {
          debouncedValue = debounced;
        }, [debounced]);

        return (
          <input
            data-testid="search-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search..."
          />
        );
      };

      render(<TestComponent />);
      
      const input = screen.getByTestId('search-input');
      
      // Type multiple characters quickly
      fireEvent.change(input, { target: { value: 'J' } });
      fireEvent.change(input, { target: { value: 'Jo' } });
      fireEvent.change(input, { target: { value: 'Joh' } });
      fireEvent.change(input, { target: { value: 'John' } });

      // Debounced value should still be empty immediately
      expect(debouncedValue).toBe('');
      
      // After debounce delay, value should update
      await waitFor(() => {
        expect(debouncedValue).toBe('John');
      }, { timeout: 400 });
    });
  });

  describe('Virtual Scrolling', () => {
    it('should only render visible items in large lists', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`
      }));

      const renderItem = jest.fn((item: any) => (
        <div key={item.id} data-testid={`item-${item.id}`}>
          {item.name}
        </div>
      ));

      render(
        <VirtualizedList
          items={largeDataset}
          itemHeight={50}
          containerHeight={300}
          renderItem={renderItem}
          overscan={5}
        />
      );

      // Should only render visible items (6 items visible + 5 overscan on each side = ~16 items max)
      expect(renderItem).toHaveBeenCalledTimes(expect.any(Number));
      expect(renderItem.mock.calls.length).toBeLessThan(50); // Much less than 1000

      // Check that first few items are rendered
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-1')).toBeInTheDocument();

      // Items far down the list should not be rendered initially
      expect(screen.queryByTestId('item-500')).not.toBeInTheDocument();
      expect(screen.queryByTestId('item-999')).not.toBeInTheDocument();
    });
  });

  describe('Employee List Performance', () => {
    it('should handle large employee datasets efficiently', () => {
      const startTime = performance.now();
      
      const largeEmployeeSet = generateMockEmployees(500);
      
      render(
        <TestWrapper>
          <OptimizedEmployeeList
            employees={largeEmployeeSet}
            loading={false}
          />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(100); // 100ms threshold

      // Should show correct employee count
      expect(screen.getByText(/Showing 500 of 500 employees/)).toBeInTheDocument();
    });

    it('should filter employees without performance degradation', async () => {
      const employees = generateMockEmployees(200);
      
      render(
        <TestWrapper>
          <OptimizedEmployeeList
            employees={employees}
            loading={false}
          />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search employees...');
      
      const startTime = performance.now();
      
      // Type in search box
      fireEvent.change(searchInput, { target: { value: 'Employee1' } });
      
      // Wait for debounce and filtering
      await waitFor(() => {
        const results = screen.getAllByText(/Employee1/);
        expect(results.length).toBeGreaterThan(0);
      });

      const endTime = performance.now();
      const filterTime = endTime - startTime;

      // Filtering should be fast even with debouncing
      expect(filterTime).toBeLessThan(500); // 500ms including debounce
    });
  });

  describe('Performance Metrics Hook', () => {
    it('should track component render times', () => {
      let capturedMetrics: any = null;

      const TestComponent = () => {
        const metrics = usePerformanceMetrics('TestComponent', {
          trackRenders: true,
          trackMemory: true
        });
        
        capturedMetrics = metrics;
        
        return <div>Test Component</div>;
      };

      render(<TestComponent />);

      expect(capturedMetrics).toBeDefined();
      expect(capturedMetrics.componentMounts).toBe(1);
      expect(capturedMetrics.rerenders).toBe(0);
      expect(typeof capturedMetrics.renderTime).toBe('number');
    });

    it('should track component rerenders', () => {
      let capturedMetrics: any = null;
      let forceUpdate: any = null;

      const TestComponent = () => {
        const [, setCount] = React.useState(0);
        const metrics = usePerformanceMetrics('TestComponent');
        
        capturedMetrics = metrics;
        forceUpdate = () => setCount(prev => prev + 1);
        
        return <div>Test Component</div>;
      };

      render(<TestComponent />);

      const initialRerenders = capturedMetrics.rerenders;
      
      // Force a rerender
      React.act(() => {
        forceUpdate();
      });

      expect(capturedMetrics.rerenders).toBe(initialRerenders + 1);
    });
  });

  describe('React.memo Optimization', () => {
    it('should not rerender child components when props have not changed', () => {
      const childRenderCount = jest.fn();

      const MemoizedChild = React.memo<{ value: string }>(({ value }) => {
        childRenderCount();
        return <div data-testid="child">{value}</div>;
      });

      const ParentComponent = () => {
        const [parentState, setParentState] = React.useState(0);
        const [childProp] = React.useState('constant');

        return (
          <div>
            <button onClick={() => setParentState(prev => prev + 1)}>
              Update Parent: {parentState}
            </button>
            <MemoizedChild value={childProp} />
          </div>
        );
      };

      render(<ParentComponent />);
      
      expect(childRenderCount).toHaveBeenCalledTimes(1);
      
      // Update parent state (should not cause child rerender)
      fireEvent.click(screen.getByText(/Update Parent: 0/));
      
      // Child should not have rerendered because props didn't change
      expect(childRenderCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('Bundle Size Optimization', () => {
    it('should support code splitting through dynamic imports', async () => {
      // Test that dynamic imports work
      const LazyComponent = React.lazy(() => 
        Promise.resolve({
          default: () => <div data-testid="lazy-component">Lazy Loaded</div>
        })
      );

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </React.Suspense>
      );

      // Should show loading state first
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Should load the component
      await waitFor(() => {
        expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
      });
    });
  });

  describe('Memory Management', () => {
    it('should not create memory leaks with large datasets', () => {
      // This is a basic test - in production you'd use tools like heap profiling
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      const employees = generateMockEmployees(1000);
      
      const { unmount } = render(
        <TestWrapper>
          <OptimizedEmployeeList
            employees={employees}
            loading={false}
          />
        </TestWrapper>
      );

      // Unmount component to trigger cleanup
      unmount();

      // Force garbage collection if available (Chrome DevTools)
      if (typeof (window as any).gc === 'function') {
        (window as any).gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory usage should not have increased significantly
      // Note: This is a basic check - real memory leak detection requires more sophisticated tools
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const increasePercentage = (memoryIncrease / initialMemory) * 100;
        
        // Allow for some memory increase but flag significant leaks
        expect(increasePercentage).toBeLessThan(50);
      }
    });
  });
});

describe('Performance Benchmarks', () => {
  const PERFORMANCE_THRESHOLDS = {
    RENDER_TIME: 16, // 60fps = 16.67ms per frame
    SEARCH_DEBOUNCE: 300,
    VIRTUAL_SCROLL_ITEMS: 50,
    BUNDLE_SIZE: 1024, // 1MB
    FIRST_PAINT: 2000, // 2 seconds
  };

  it('should meet render time performance targets', () => {
    const employees = generateMockEmployees(100);
    
    const startTime = performance.now();
    
    render(
      <TestWrapper>
        <OptimizedEmployeeList
          employees={employees}
          loading={false}
        />
      </TestWrapper>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME);
  });

  it('should meet search responsiveness targets', async () => {
    const employees = generateMockEmployees(500);
    
    render(
      <TestWrapper>
        <OptimizedEmployeeList
          employees={employees}
          loading={false}
        />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search employees...');
    
    const startTime = performance.now();
    fireEvent.change(searchInput, { target: { value: 'Employee100' } });
    
    await waitFor(() => {
      expect(screen.getByText('Employee100')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const searchTime = endTime - startTime;
    
    // Should include debounce delay
    expect(searchTime).toBeGreaterThan(PERFORMANCE_THRESHOLDS.SEARCH_DEBOUNCE - 50);
    expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_DEBOUNCE + 100);
  });
});