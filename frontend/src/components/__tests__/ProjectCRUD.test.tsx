import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the components that don't exist yet
import { ProjectsPage } from '../projects/ProjectsPage';
import { ProjectFormModal } from '../projects/ProjectFormModal';
import { ProjectCard } from '../projects/ProjectCard';
import { DeleteProjectDialog } from '../projects/DeleteProjectDialog';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

describe('Project CRUD Operations - RED Phase (Failing Tests)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], total: 0 }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Add Project Button and Form Modal', () => {
    it('should display "Add Project" button on projects page', async () => {
      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      const addButton = screen.getByRole('button', { name: /add project/i });
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveAttribute('data-testid', 'add-project-button');
    });

    it('should open project form modal when "Add Project" button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('data-testid', 'project-form-modal');
      
      const modalTitle = within(modal).getByText(/add project/i);
      expect(modalTitle).toBeInTheDocument();
    });

    it('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      // Open modal
      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      // Check required fields as per PRD
      const nameField = screen.getByLabelText(/project name/i);
      expect(nameField).toBeInTheDocument();
      expect(nameField).toBeRequired();

      const startDateField = screen.getByLabelText(/start date/i);
      expect(startDateField).toBeInTheDocument();
      expect(startDateField).toBeRequired();

      const endDateField = screen.getByLabelText(/end date/i);
      expect(endDateField).toBeInTheDocument();
      expect(endDateField).toBeRequired();
    });

    it('should display optional fields: description, client, budget', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      const descriptionField = screen.getByLabelText(/description/i);
      expect(descriptionField).toBeInTheDocument();
      expect(descriptionField).not.toBeRequired();

      const clientField = screen.getByLabelText(/client/i);
      expect(clientField).toBeInTheDocument();
      expect(clientField).not.toBeRequired();

      const budgetField = screen.getByLabelText(/budget/i);
      expect(budgetField).toBeInTheDocument();
      expect(budgetField).not.toBeRequired();
    });

    it('should validate required fields before submission', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Should show validation errors
      expect(screen.getByText(/project name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/start date is required/i)).toBeInTheDocument();
      expect(screen.getByText(/end date is required/i)).toBeInTheDocument();
    });

    it('should validate date range (end date after start date)', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      const startDateField = screen.getByLabelText(/start date/i);
      const endDateField = screen.getByLabelText(/end date/i);

      await user.type(startDateField, '2024-12-31');
      await user.type(endDateField, '2024-01-01');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
    });
  });

  describe('Project Creation and PostgreSQL Persistence', () => {
    it('should make POST request to /api/projects when form is submitted', async () => {
      const user = userEvent.setup();
      const mockProject = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'planning',
        priority: 'medium',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockProject }),
      });

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      // Fill form
      await user.type(screen.getByLabelText(/project name/i), 'Test Project');
      await user.type(screen.getByLabelText(/description/i), 'Test Description');
      await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-31');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/projects',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Test Project',
              description: 'Test Description',
              start_date: '2024-01-01',
              end_date: '2024-12-31',
              status: 'planning',
              priority: 'medium',
            }),
          })
        );
      });
    });

    it('should handle API errors during project creation', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      await user.type(screen.getByLabelText(/project name/i), 'Test Project');
      await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-31');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error creating project/i)).toBeInTheDocument();
      });
    });
  });

  describe('Project Grid Display After Creation', () => {
    it('should refresh projects list after successful creation', async () => {
      const user = userEvent.setup();
      const existingProjects = [
        { id: 1, name: 'Existing Project', status: 'active' },
      ];
      const newProject = {
        id: 2,
        name: 'New Test Project',
        description: 'Test Description',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'planning',
      };

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: existingProjects }),
      });

      // Project creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: newProject }),
      });

      // Refresh after creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [...existingProjects, newProject] }),
      });

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Existing Project')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add project/i });
      await user.click(addButton);

      await user.type(screen.getByLabelText(/project name/i), 'New Test Project');
      await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-31');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Should show new project in grid
      await waitFor(() => {
        expect(screen.getByText('New Test Project')).toBeInTheDocument();
      });
    });

    it('should display project in correct grid format', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        status: 'planning',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockProject] }),
      });

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const projectCard = screen.getByTestId('project-1');
        expect(projectCard).toBeInTheDocument();
        
        within(projectCard).getByText('Test Project');
        within(projectCard).getByText('Test Description');
        within(projectCard).getByText('planning');
      });
    });
  });

  describe('Project Edit/Update Functionality', () => {
    it('should show edit button on project cards', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        status: 'planning',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockProject] }),
      });

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /edit project/i });
        expect(editButton).toBeInTheDocument();
        expect(editButton).toHaveAttribute('data-testid', 'edit-project-1');
      });
    });

    it('should open edit modal with pre-filled form when edit button is clicked', async () => {
      const user = userEvent.setup();
      const mockProject = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'planning',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockProject] }),
      });

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /edit project/i });
        user.click(editButton);
      });

      const modal = await screen.findByRole('dialog');
      expect(modal).toHaveAttribute('data-testid', 'project-form-modal');
      
      const modalTitle = within(modal).getByText(/edit project/i);
      expect(modalTitle).toBeInTheDocument();

      // Form should be pre-filled
      expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument();
    });

    it('should make PUT request when updating existing project', async () => {
      const user = userEvent.setup();
      const mockProject = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'planning',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockProject] }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { ...mockProject, name: 'Updated Project' } }),
      });

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /edit project/i });
        user.click(editButton);
      });

      const nameField = await screen.findByDisplayValue('Test Project');
      await user.clear(nameField);
      await user.type(nameField, 'Updated Project');

      const submitButton = screen.getByRole('button', { name: /update project/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          'http://localhost:3001/api/projects/1',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('Updated Project'),
          })
        );
      });
    });
  });

  describe('Project Deletion with Confirmation', () => {
    it('should show delete button on project cards', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        status: 'planning',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockProject] }),
      });

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete project/i });
        expect(deleteButton).toBeInTheDocument();
        expect(deleteButton).toHaveAttribute('data-testid', 'delete-project-1');
      });
    });

    it('should show confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      const mockProject = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        status: 'planning',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockProject] }),
      });

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete project/i });
        user.click(deleteButton);
      });

      const confirmDialog = await screen.findByRole('dialog');
      expect(confirmDialog).toHaveAttribute('data-testid', 'delete-project-dialog');
      
      const confirmTitle = within(confirmDialog).getByText(/delete project/i);
      expect(confirmTitle).toBeInTheDocument();
      
      const projectName = within(confirmDialog).getByText('Test Project');
      expect(projectName).toBeInTheDocument();
    });

    it('should make DELETE request when deletion is confirmed', async () => {
      const user = userEvent.setup();
      const mockProject = {
        id: 1,
        name: 'Test Project',
        status: 'planning',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockProject] }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete project/i });
        user.click(deleteButton);
      });

      const confirmButton = await screen.findByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          'http://localhost:3001/api/projects/1',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    it('should remove project from grid after successful deletion', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { id: 1, name: 'Test Project', status: 'planning' },
        { id: 2, name: 'Keep Project', status: 'active' },
      ];

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockProjects }),
      });

      // Delete request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Refresh after delete
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockProjects[1]] }),
      });

      render(
        <TestWrapper>
          <ProjectsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('Keep Project')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTestId('delete-project-1');
      await user.click(deleteButton);

      const confirmButton = await screen.findByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
        expect(screen.getByText('Keep Project')).toBeInTheDocument();
      });
    });
  });
});