import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CSVImportDialog } from '@/components/employees/CSVImportDialog';
import { EmployeeService } from '@/services/api';

// Mock the API service
vi.mock('@/services/api');
const mockEmployeeService = vi.mocked(EmployeeService);

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Mock file for testing
const createMockFile = (name: string, content: string, type: string = 'text/csv') => {
  const file = new File([content], name, { type });
  return file;
};

describe('CSVImportDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock URL methods
    global.URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock document methods for download
    const mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
    };
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return mockLink as any;
      }
      return document.createElement(tagName);
    });
    
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders import dialog correctly', () => {
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    expect(screen.getByText('Import Employees from CSV')).toBeInTheDocument();
    expect(screen.getByText('Upload a CSV file to import multiple employees at once.')).toBeInTheDocument();
    expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument();
    expect(screen.getByText('CSV files up to 10MB')).toBeInTheDocument();
  });

  it('shows format requirements', () => {
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    expect(screen.getByText('CSV Format Requirements:')).toBeInTheDocument();
    expect(screen.getByText('First row must contain column headers')).toBeInTheDocument();
    expect(screen.getByText(/Required fields: firstName, lastName, email/)).toBeInTheDocument();
    expect(screen.getByText('Date format: YYYY-MM-DD')).toBeInTheDocument();
    expect(screen.getByText(/Status values: 'active' or 'inactive'/)).toBeInTheDocument();
  });

  it('downloads template file', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    const downloadButton = screen.getByRole('button', { name: /download template/i });
    await user.click(downloadButton);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('handles file selection via input', async () => {
    const user = userEvent.setup();
    mockEmployeeService.importCSV.mockResolvedValue({ imported: 2, errors: [] });
    
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com';
    const file = createMockFile('employees.csv', csvContent);

    const fileInput = screen.getByRole('button', { hidden: true });
    await user.upload(fileInput as HTMLInputElement, file);

    await waitFor(() => {
      expect(mockEmployeeService.importCSV).toHaveBeenCalledWith(file);
    });
  });

  it('handles successful import', async () => {
    const user = userEvent.setup();
    mockEmployeeService.importCSV.mockResolvedValue({ imported: 2, errors: [] });
    
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com';
    const file = createMockFile('employees.csv', csvContent);

    // Simulate file drop
    const dropZone = screen.getByText('Click to upload or drag and drop').closest('div');
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Import Successful!')).toBeInTheDocument();
      expect(screen.getByText('Successfully imported 2 employees.')).toBeInTheDocument();
    });
  });

  it('handles import with errors', async () => {
    const user = userEvent.setup();
    mockEmployeeService.importCSV.mockResolvedValue({ 
      imported: 1, 
      errors: ['Row 2: Missing required field "email"', 'Row 3: Invalid email format'] 
    });
    
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com\nJane,Smith,\nBob,Johnson,invalid-email';
    const file = createMockFile('employees.csv', csvContent);

    const dropZone = screen.getByText('Click to upload or drag and drop').closest('div');
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Import Successful!')).toBeInTheDocument();
      expect(screen.getByText('Successfully imported 1 employee.')).toBeInTheDocument();
      expect(screen.getByText('Some Issues Found')).toBeInTheDocument();
      expect(screen.getByText('Row 2: Missing required field "email"')).toBeInTheDocument();
      expect(screen.getByText('Row 3: Invalid email format')).toBeInTheDocument();
    });
  });

  it('handles import failure', async () => {
    const user = userEvent.setup();
    mockEmployeeService.importCSV.mockRejectedValue(new Error('Server error'));
    
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com';
    const file = createMockFile('employees.csv', csvContent);

    const dropZone = screen.getByText('Click to upload or drag and drop').closest('div');
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Import Failed')).toBeInTheDocument();
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('validates file type', async () => {
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    const file = createMockFile('employees.txt', 'not a csv', 'text/plain');

    const dropZone = screen.getByText('Click to upload or drag and drop').closest('div');
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Import Failed')).toBeInTheDocument();
      expect(screen.getByText('Please select a CSV file.')).toBeInTheDocument();
    });
    
    expect(mockEmployeeService.importCSV).not.toHaveBeenCalled();
  });

  it('validates file size', async () => {
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    // Create a large content string to simulate file > 10MB
    const largeContent = 'a'.repeat(11 * 1024 * 1024); // 11MB
    const file = createMockFile('large.csv', largeContent);

    const dropZone = screen.getByText('Click to upload or drag and drop').closest('div');
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Import Failed')).toBeInTheDocument();
      expect(screen.getByText('File size must be less than 10MB.')).toBeInTheDocument();
    });
    
    expect(mockEmployeeService.importCSV).not.toHaveBeenCalled();
  });

  it('handles drag and drop interactions', async () => {
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    const dropZone = screen.getByText('Click to upload or drag and drop').closest('div');

    // Test drag enter
    fireEvent.dragEnter(dropZone!, {
      dataTransfer: {
        files: [],
      },
    });

    expect(dropZone).toHaveClass('border-primary', 'bg-primary/5');

    // Test drag leave
    fireEvent.dragLeave(dropZone!, {
      dataTransfer: {
        files: [],
      },
    });

    expect(dropZone).not.toHaveClass('border-primary', 'bg-primary/5');
  });

  it('shows loading state during import', async () => {
    let resolveImport: (value: any) => void;
    const importPromise = new Promise((resolve) => {
      resolveImport = resolve;
    });
    mockEmployeeService.importCSV.mockReturnValue(importPromise as any);
    
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com';
    const file = createMockFile('employees.csv', csvContent);

    const dropZone = screen.getByText('Click to upload or drag and drop').closest('div');
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Importing employees...')).toBeInTheDocument();
    });

    // Complete the import
    resolveImport!({ imported: 1, errors: [] });

    await waitFor(() => {
      expect(screen.getByText('Import Successful!')).toBeInTheDocument();
    });
  });

  it('allows importing another file after success', async () => {
    const user = userEvent.setup();
    mockEmployeeService.importCSV.mockResolvedValue({ imported: 1, errors: [] });
    
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com';
    const file = createMockFile('employees.csv', csvContent);

    const dropZone = screen.getByText('Click to upload or drag and drop').closest('div');
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Import Successful!')).toBeInTheDocument();
    });

    const importAnotherButton = screen.getByRole('button', { name: /import another file/i });
    await user.click(importAnotherButton);

    // Should return to initial state
    expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument();
    expect(screen.queryByText('Import Successful!')).not.toBeInTheDocument();
  });

  it('closes dialog properly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes dialog after successful import', async () => {
    const user = userEvent.setup();
    mockEmployeeService.importCSV.mockResolvedValue({ imported: 1, errors: [] });
    
    render(
      <TestWrapper>
        <CSVImportDialog open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com';
    const file = createMockFile('employees.csv', csvContent);

    const dropZone = screen.getByText('Click to upload or drag and drop').closest('div');
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Import Successful!')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});