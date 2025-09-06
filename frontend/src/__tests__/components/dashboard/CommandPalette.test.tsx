import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../../../components/dashboard/CommandPalette';
import { Employee, Project } from '../../../hooks/useResourceData';

// Mock cmdk
jest.mock('cmdk', () => ({
  Command: ({ children, ...props }: any) => <div role="combobox" {...props}>{children}</div>,
  CommandInput: ({ ...props }: any) => <input role="searchbox" {...props} />,
  CommandList: ({ children, ...props }: any) => <div role="listbox" {...props}>{children}</div>,
  CommandEmpty: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CommandGroup: ({ children, heading, ...props }: any) => (
    <div role="group" {...props}>
      {heading && <div role="heading">{heading}</div>}
      {children}
    </div>
  ),
  CommandItem: ({ children, onSelect, ...props }: any) => (
    <button role="option" onClick={() => onSelect?.()} {...props}>
      {children}
    </button>
  ),
  CommandSeparator: ({ ...props }: any) => <hr {...props} />,
}));

// Mock API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockEmployees: Employee[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    departmentId: 1,
    position: 'Senior Developer',
    skills: ['React', 'TypeScript'],
    isActive: true
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@company.com',
    departmentId: 2,
    position: 'UX Designer',
    skills: ['Figma', 'User Research'],
    isActive: true
  }
];

const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Customer Portal',
    description: 'New customer portal development',
    status: 'active',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-06-01T00:00:00.000Z',
    requiredSkills: ['React', 'TypeScript'],
    priority: 'high'
  },
  {
    id: 'project-2',
    name: 'Mobile App',
    description: 'React Native mobile application',
    status: 'planning',
    startDate: '2025-03-01T00:00:00.000Z',
    endDate: '2025-08-01T00:00:00.000Z',
    requiredSkills: ['React Native', 'TypeScript'],
    priority: 'medium'
  }
];

describe('CommandPalette', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockFetch.mockClear();
    // Mock successful API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/employees')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockEmployees })
        });
      }
      if (url.includes('/projects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockProjects })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('opens when Cmd+K is pressed', async () => {
      const onOpen = jest.fn();
      render(<CommandPalette isOpen={false} onOpen={onOpen} onClose={() => {}} />);
      
      await user.keyboard('{Meta>}k{/Meta}');
      expect(onOpen).toHaveBeenCalled();
    });

    it('opens when Ctrl+K is pressed on Windows/Linux', async () => {
      const onOpen = jest.fn();
      render(<CommandPalette isOpen={false} onOpen={onOpen} onClose={() => {}} />);
      
      await user.keyboard('{Control>}k{/Control}');
      expect(onOpen).toHaveBeenCalled();
    });

    it('closes when Escape is pressed', async () => {
      const onClose = jest.fn();
      render(<CommandPalette isOpen={true} onOpen={() => {}} onClose={onClose} />);
      
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalled();
    });

    it('navigates options with arrow keys', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          employees={mockEmployees}
          projects={mockProjects}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'John');
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('option', { name: /John Doe/ })).toHaveAttribute('aria-selected', 'true');
    });

    it('selects option with Enter key', async () => {
      const onSelect = jest.fn();
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          onEmployeeSelect={onSelect}
          employees={mockEmployees}
          projects={mockProjects}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'John');
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      await user.keyboard('{ArrowDown}{Enter}');
      expect(onSelect).toHaveBeenCalledWith(mockEmployees[0]);
    });
  });

  describe('Search Functionality', () => {
    it('renders search input when open', () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
        />
      );
      
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Type to search employees, projects/)).toBeInTheDocument();
    });

    it('shows loading state during search', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'John');
      
      expect(screen.getByText(/Searching.../)).toBeInTheDocument();
    });

    it('searches employees by name', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          employees={mockEmployees}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'John');
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Senior Developer')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('searches employees by skills', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          employees={mockEmployees}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'React');
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('searches projects by name', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          projects={mockProjects}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'Customer');
      
      await waitFor(() => {
        expect(screen.getByText('Customer Portal')).toBeInTheDocument();
        expect(screen.queryByText('Mobile App')).not.toBeInTheDocument();
      });
    });

    it('shows no results message when search yields no matches', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          employees={mockEmployees}
          projects={mockProjects}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'nonexistent');
      
      await waitFor(() => {
        expect(screen.getByText('No results found.')).toBeInTheDocument();
      });
    });

    it('supports fuzzy search for typos', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          employees={mockEmployees}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'Jhon'); // Typo in "John"
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Real API Integration', () => {
    it('fetches employees from real API', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'John');
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/employees',
          expect.objectContaining({
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          })
        );
      });
    });

    it('fetches projects from real API', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'project');
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/projects',
          expect.objectContaining({
            method: 'GET'
          })
        );
      });
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));
      
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      });
    });

    it('debounces API calls during typing', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'John Doe');
      
      // Should only make one API call after debounce period
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2); // employees and projects
      }, { timeout: 1000 });
    });
  });

  describe('Command Groups', () => {
    it('displays employees in a separate group', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          employees={mockEmployees}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Employees' })).toBeInTheDocument();
      });
    });

    it('displays projects in a separate group', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          projects={mockProjects}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
      });
    });

    it('displays quick actions group', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quick Actions' })).toBeInTheDocument();
        expect(screen.getByText('Create New Assignment')).toBeInTheDocument();
        expect(screen.getByText('View Resource Analytics')).toBeInTheDocument();
        expect(screen.getByText('Export Data')).toBeInTheDocument();
      });
    });
  });

  describe('Selection Callbacks', () => {
    it('calls onEmployeeSelect when employee is selected', async () => {
      const onEmployeeSelect = jest.fn();
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          onEmployeeSelect={onEmployeeSelect}
          employees={mockEmployees}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'John');
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('option', { name: /John Doe/ }));
      expect(onEmployeeSelect).toHaveBeenCalledWith(mockEmployees[0]);
    });

    it('calls onProjectSelect when project is selected', async () => {
      const onProjectSelect = jest.fn();
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          onProjectSelect={onProjectSelect}
          projects={mockProjects}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'Customer');
      
      await waitFor(() => {
        expect(screen.getByText('Customer Portal')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('option', { name: /Customer Portal/ }));
      expect(onProjectSelect).toHaveBeenCalledWith(mockProjects[0]);
    });

    it('calls onActionSelect when quick action is selected', async () => {
      const onActionSelect = jest.fn();
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          onActionSelect={onActionSelect}
        />
      );
      
      await user.click(screen.getByRole('option', { name: /Create New Assignment/ }));
      expect(onActionSelect).toHaveBeenCalledWith('create-assignment');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
        />
      );
      
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', 'Command palette');
      expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'Search employees and projects');
    });

    it('announces search results to screen readers', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          employees={mockEmployees}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'John');
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
        expect(screen.getByRole('status')).toHaveTextContent('1 result found');
      });
    });

    it('supports screen reader navigation', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          employees={mockEmployees}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveAttribute('aria-label', 'Search results');
      });
    });
  });

  describe('Performance', () => {
    it('virtualizes long lists of results', async () => {
      const manyEmployees = Array.from({ length: 1000 }, (_, i) => ({
        ...mockEmployees[0],
        id: i,
        firstName: `Employee${i}`,
        lastName: `Last${i}`,
        email: `employee${i}@company.com`
      }));
      
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          employees={manyEmployees}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'Employee');
      
      // Should only render visible items
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeLessThan(100); // Virtualized
      });
    });

    it('limits search results to prevent performance issues', async () => {
      render(
        <CommandPalette 
          isOpen={true} 
          onOpen={() => {}} 
          onClose={() => {}}
          employees={mockEmployees}
          maxResults={1}
        />
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'e'); // Should match both employees
      
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeLessThanOrEqual(3); // 1 employee + actions
      });
    });
  });
});