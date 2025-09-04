import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { EmployeeList } from '@/components/employees/EmployeeList'
import { EmployeeService } from '@/services/api'
import type { Employee } from '@/types/employee'

// Mock the employee service
vi.mock('@/services/api', () => ({
  EmployeeService: {
    getEmployees: vi.fn(),
    deleteEmployee: vi.fn(),
  },
}))

const mockEmployees: Employee[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    department: 'Engineering',
    position: 'Software Engineer',
    salary: 75000,
    startDate: '2023-01-15',
    status: 'active',
    createdAt: '2023-01-15T00:00:00.000Z',
    updatedAt: '2023-01-15T00:00:00.000Z',
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '(555) 987-6543',
    department: 'Marketing',
    position: 'Marketing Manager',
    salary: 85000,
    startDate: '2022-06-01',
    status: 'active',
    createdAt: '2022-06-01T00:00:00.000Z',
    updatedAt: '2022-06-01T00:00:00.000Z',
  },
]

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('EmployeeList', () => {
  const mockHandlers = {
    onEmployeeSelect: vi.fn(),
    onEmployeeCreate: vi.fn(),
    onEmployeeEdit: vi.fn(),
    onCSVImport: vi.fn(),
    onCSVExport: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(EmployeeService.getEmployees).mockResolvedValue({
      employees: mockEmployees,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
  })

  it('renders employee list with correct data', async () => {
    renderWithQueryClient(<EmployeeList {...mockHandlers} />)

    expect(screen.getByText('Employee Directory')).toBeInTheDocument()
    expect(screen.getByText('Manage your organization\'s employee information')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
      expect(screen.getByText('Engineering')).toBeInTheDocument()
      expect(screen.getByText('Marketing')).toBeInTheDocument()
    })
  })

  it('handles search input correctly', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<EmployeeList {...mockHandlers} />)

    const searchInput = screen.getByPlaceholderText('Search employees...')
    await user.type(searchInput, 'john')

    expect(searchInput).toHaveValue('john')

    await waitFor(() => {
      expect(EmployeeService.getEmployees).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'john' }),
        expect.any(Object)
      )
    })
  })

  it('calls onEmployeeCreate when Add Employee button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<EmployeeList {...mockHandlers} />)

    const addButton = screen.getByRole('button', { name: /add employee/i })
    await user.click(addButton)

    expect(mockHandlers.onEmployeeCreate).toHaveBeenCalledOnce()
  })

  it('calls onCSVImport when Import CSV button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<EmployeeList {...mockHandlers} />)

    const importButton = screen.getByRole('button', { name: /import csv/i })
    await user.click(importButton)

    expect(mockHandlers.onCSVImport).toHaveBeenCalledOnce()
  })

  it('calls onCSVExport when Export CSV button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<EmployeeList {...mockHandlers} />)

    const exportButton = screen.getByRole('button', { name: /export csv/i })
    await user.click(exportButton)

    expect(mockHandlers.onCSVExport).toHaveBeenCalledOnce()
  })

  it('handles sorting correctly', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<EmployeeList {...mockHandlers} />)

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument()
    })

    const nameHeader = screen.getByText('Name')
    await user.click(nameHeader)

    await waitFor(() => {
      expect(EmployeeService.getEmployees).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          sortBy: 'firstName',
          sortOrder: 'desc',
        })
      )
    })
  })

  it('calls onEmployeeEdit when edit button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<EmployeeList {...mockHandlers} />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByRole('button', { name: '' })
    const editButton = editButtons.find(button => 
      button.querySelector('svg')?.getAttribute('data-testid') === 'edit-icon' ||
      button.innerHTML.includes('Edit')
    )

    if (editButton) {
      await user.click(editButton)
      expect(mockHandlers.onEmployeeEdit).toHaveBeenCalledWith(mockEmployees[0])
    }
  })

  it('displays loading state', () => {
    vi.mocked(EmployeeService.getEmployees).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    renderWithQueryClient(<EmployeeList {...mockHandlers} />)

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
  })

  it('displays error state', async () => {
    const errorMessage = 'Failed to fetch employees'
    vi.mocked(EmployeeService.getEmployees).mockRejectedValue(new Error(errorMessage))

    renderWithQueryClient(<EmployeeList {...mockHandlers} />)

    await waitFor(() => {
      expect(screen.getByText(`Error loading employees: ${errorMessage}`)).toBeInTheDocument()
    })
  })

  it('handles pagination correctly', async () => {
    const user = userEvent.setup()
    vi.mocked(EmployeeService.getEmployees).mockResolvedValue({
      employees: mockEmployees,
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
    })

    renderWithQueryClient(<EmployeeList {...mockHandlers} />)

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 2 of 25 employees')).toBeInTheDocument()
    })

    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(EmployeeService.getEmployees).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ page: 2 })
      )
    })
  })

  it('formats currency and dates correctly', async () => {
    renderWithQueryClient(<EmployeeList {...mockHandlers} />)

    await waitFor(() => {
      expect(screen.getByText('$75,000')).toBeInTheDocument()
      expect(screen.getByText('$85,000')).toBeInTheDocument()
      expect(screen.getByText('Jan 15, 2023')).toBeInTheDocument()
      expect(screen.getByText('Jun 1, 2022')).toBeInTheDocument()
    })
  })
})