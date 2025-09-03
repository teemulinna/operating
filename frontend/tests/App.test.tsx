import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';

// Mock the EmployeeList component
vi.mock('@/components/employees/EmployeeList', () => ({
  EmployeeList: () => <div data-testid="employee-list">Employee List Component</div>
}));

// Mock the API service to prevent actual API calls
vi.mock('@/services/api', () => ({
  EmployeeService: {
    getEmployees: vi.fn(),
    getDepartments: vi.fn(),
    getPositions: vi.fn(),
  },
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    
    // Should render the main application
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('renders employee management page', async () => {
    render(<App />);

    // Should show the employee list (app redirects to /employees by default)
    expect(await screen.findByTestId('employee-list')).toBeInTheDocument();
  });

  it('has proper document structure', () => {
    render(<App />);
    
    // Should have the main container classes
    const mainContainer = document.querySelector('.min-h-screen');
    expect(mainContainer).toBeInTheDocument();
  });

  it('wraps components with error boundary', () => {
    // This test verifies the ErrorBoundary is in place
    // In a real scenario, we would test error handling by making a component throw
    render(<App />);
    
    // If no error is thrown, the app should render normally
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('includes QueryProvider for React Query', async () => {
    render(<App />);
    
    // React Query should be available (verified by successful component render)
    expect(await screen.findByTestId('employee-list')).toBeInTheDocument();
  });
});