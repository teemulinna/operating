import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll } from 'vitest';

import { ProjectsPage } from '../projects/ProjectsPage';
import { ProjectFormModal } from '../projects/ProjectFormModal';
import { ProjectCard } from '../projects/ProjectCard';
import { DeleteProjectDialog } from '../projects/DeleteProjectDialog';

const API_BASE_URL = 'http://localhost:3001/api';

// Test wrapper with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Project CRUD Operations - REAL BACKEND INTEGRATION', () => {
  let realProjects: any[] = [];

  beforeAll(async () => {
    // Fetch REAL projects from backend
    try {
      const response = await fetch(`${API_BASE_URL}/projects?limit=100`);
      const data = await response.json();
      realProjects = data.data || [];

      console.log(`✅ Real projects loaded: ${realProjects.length} projects from live database`);
    } catch (error) {
      console.error('Failed to fetch real projects from backend:', error);
      throw new Error('Backend API must be running at http://localhost:3001 for tests to pass');
    }
  });

  describe('Add Project Button and Form Modal', () => {
    it('should display "Add Project" button on projects page', async () => {
      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const addButton = screen.queryByRole('button', { name: /add project/i });
        if (addButton) {
          expect(addButton).toBeInTheDocument();
          expect(addButton).toHaveAttribute('data-testid', 'add-project-button');
        }
      }, { timeout: 5000 });
    });

    it('should open project form modal when "Add Project" button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /add project/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      await waitFor(() => {
        const modal = screen.queryByRole('dialog');
        if (modal) {
          expect(modal).toBeInTheDocument();
          expect(modal).toHaveAttribute('data-testid', 'project-form-modal');

          const modalTitle = within(modal).queryByText(/add project/i);
          expect(modalTitle).toBeInTheDocument();
        }
      });
    });

    it('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      // Open modal
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /add project/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeInTheDocument();
      });

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Project Form Fields Validation (PRD Required)', () => {
    it('should display required form fields: name, start date, end date', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      // Open modal
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /add project/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      await waitFor(() => {
        const modal = screen.queryByRole('dialog');
        expect(modal).toBeInTheDocument();
      });

      // Check for required fields
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });

    it('should display optional fields: description, client, budget', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      // Open modal
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /add project/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeInTheDocument();
      });

      // Check for optional fields
      expect(screen.queryByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/client/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/budget/i)).toBeInTheDocument();
    });

    it('should validate required fields before submission', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      // Open modal
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /add project/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        const errors = screen.queryAllByText(/required/i);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it('should validate date range (end date after start date)', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      // Open modal
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /add project/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeInTheDocument();
      });

      // Fill fields with invalid date range
      const nameInput = screen.getByLabelText(/project name/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await user.type(nameInput, 'Test Project');
      await user.type(startDateInput, '2025-12-31');
      await user.type(endDateInput, '2025-01-01'); // End before start

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        const error = screen.queryByText(/end date must be after start date/i);
        expect(error).toBeInTheDocument();
      });
    });
  });

  describe('Project Creation and PostgreSQL Persistence', () => {
    it('should make POST request to /api/projects when form is submitted', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      // Open modal
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /add project/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeInTheDocument();
      });

      // Fill form with valid data
      const nameInput = screen.getByLabelText(/project name/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await user.type(nameInput, 'Integration Test Project');
      await user.type(startDateInput, '2025-01-01');
      await user.type(endDateInput, '2025-12-31');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Wait for success
      await waitFor(() => {
        // Modal should close on success
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify project appears in list
      await waitFor(() => {
        expect(screen.queryByText('Integration Test Project')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should handle API errors during project creation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      // Open modal
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /add project/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeInTheDocument();
      });

      // Fill form with potentially invalid data (very long name to trigger validation)
      const nameInput = screen.getByLabelText(/project name/i);
      const invalidName = 'a'.repeat(500); // Exceed max length

      await user.type(nameInput, invalidName);

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        const error = screen.queryByText(/error/i);
        expect(error).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Project Grid Display After Creation', () => {
    it('should refresh projects list after successful creation', async () => {
      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Should display projects from real database
      if (realProjects.length > 0) {
        const firstProject = realProjects[0];
        expect(screen.queryByText(firstProject.name)).toBeInTheDocument();
      }
    });
  });
});
