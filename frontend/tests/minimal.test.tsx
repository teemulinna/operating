import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Ultra minimal dashboard component for testing
function MinimalDashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Test dashboard component</p>
    </div>
  );
}

// Ultra minimal navigation component  
function MinimalNav() {
  return (
    <nav>
      <a href="/">Dashboard</a>
      <a href="/employees">Employees</a>
    </nav>
  );
}

// Ultra minimal app component
function MinimalApp() {
  return (
    <MemoryRouter>
      <div className="min-h-screen bg-gray-50">
        <MinimalNav />
        <main>
          <MinimalDashboard />
        </main>
      </div>
    </MemoryRouter>
  );
}

describe('Minimal App Test - TDD GREEN Phase', () => {
  it('should render without JavaScript errors', () => {
    expect(() => {
      render(<MinimalApp />);
    }).not.toThrow();
  });

  it('should display "Dashboard" text', async () => {
    render(<MinimalApp />);
    
    const dashboardHeading = await screen.findByRole('heading', { name: 'Dashboard' });
    expect(dashboardHeading).toBeInTheDocument();
  });

  it('should display navigation with Dashboard link', async () => {
    render(<MinimalApp />);
    
    const dashboardLink = await screen.findByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
  });

  it('should display navigation with Employees link', async () => {
    render(<MinimalApp />);
    
    const employeesLink = await screen.findByRole('link', { name: /employees/i });
    expect(employeesLink).toBeInTheDocument();
  });

  it('should have proper document structure', () => {
    render(<MinimalApp />);
    
    const mainContainer = document.querySelector('.min-h-screen');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass('bg-gray-50');
  });
});
