import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { EmployeeForm } from '@/components/employees/EmployeeForm'
import { EmployeeService } from '@/services/api'
import type { Employee } from '@/types/employee'

// Mock the employee service
vi.mock('@/services/api', () => ({
  EmployeeService: {
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    getDepartments: vi.fn(),
    getPositions: vi.fn(),
  },
}))

const mockEmployee: Employee = {
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
  address: '123 Main St',
  emergencyContact: 'Jane Doe (555) 987-6543',
  notes: 'Excellent performance',
  createdAt: '2023-01-15T00:00:00.000Z',
  updatedAt: '2023-01-15T00:00:00.000Z',
}

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

describe('EmployeeForm', () => {
  const mockHandlers = {
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(EmployeeService.getDepartments).mockResolvedValue([
      'Engineering',
      'Marketing',
      'Sales',
      'HR',
    ])
    vi.mocked(EmployeeService.getPositions).mockResolvedValue([
      'Software Engineer',
      'Marketing Manager',
      'Sales Representative',
      'HR Specialist',
    ])
  })

  it('renders create form correctly', async () => {
    renderWithQueryClient(<EmployeeForm {...mockHandlers} />)

    expect(screen.getByText('Add New Employee')).toBeInTheDocument()
    expect(screen.getByText('Enter the details for the new employee')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create employee/i })).toBeInTheDocument()

    // Check required fields are present
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/position/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/salary/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
  })

  it('renders edit form correctly', async () => {
    renderWithQueryClient(<EmployeeForm employee={mockEmployee} {...mockHandlers} />)

    expect(screen.getByText('Edit Employee')).toBeInTheDocument()
    expect(screen.getByText('Update employee information below')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update employee/i })).toBeInTheDocument()

    // Check form is populated with existing data
    expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('(555) 123-4567')).toBeInTheDocument()
    expect(screen.getByDisplayValue('75000')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<EmployeeForm {...mockHandlers} />)

    const submitButton = screen.getByRole('button', { name: /create employee/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument()
      expect(screen.getByText('Last name is required')).toBeInTheDocument()
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
      expect(screen.getByText('Phone number must be at least 10 digits')).toBeInTheDocument()
      expect(screen.getByText('Department is required')).toBeInTheDocument()
      expect(screen.getByText('Position is required')).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<EmployeeForm {...mockHandlers} />)

    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')

    const submitButton = screen.getByRole('button', { name: /create employee/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })
  })

  it('validates salary is positive', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<EmployeeForm {...mockHandlers} />)

    const salaryInput = screen.getByLabelText(/salary/i)
    await user.type(salaryInput, '-1000')

    const submitButton = screen.getByRole('button', { name: /create employee/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Salary must be positive')).toBeInTheDocument()
    })
  })

  it('submits form with valid data for new employee', async () => {
    const user = userEvent.setup()
    vi.mocked(EmployeeService.createEmployee).mockResolvedValue(mockEmployee)
    
    renderWithQueryClient(<EmployeeForm {...mockHandlers} />)

    // Fill out the form
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com')
    await user.type(screen.getByLabelText(/phone/i), '5551234567')
    await user.selectOptions(screen.getByLabelText(/department/i), 'Engineering')
    await user.selectOptions(screen.getByLabelText(/position/i), 'Software Engineer')
    await user.type(screen.getByLabelText(/salary/i), '75000')
    await user.type(screen.getByLabelText(/start date/i), '2023-01-15')

    const submitButton = screen.getByRole('button', { name: /create employee/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(EmployeeService.createEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '5551234567',
          department: 'Engineering',
          position: 'Software Engineer',
          salary: 75000,
          startDate: '2023-01-15',
          status: 'active',
        })
      )
      expect(mockHandlers.onSuccess).toHaveBeenCalledWith(mockEmployee)
    })
  })

  it('submits form with valid data for existing employee', async () => {
    const user = userEvent.setup()
    const updatedEmployee = { ...mockEmployee, firstName: 'Jane' }
    vi.mocked(EmployeeService.updateEmployee).mockResolvedValue(updatedEmployee)
    
    renderWithQueryClient(<EmployeeForm employee={mockEmployee} {...mockHandlers} />)

    // Update the first name
    const firstNameInput = screen.getByDisplayValue('John')
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Jane')

    const submitButton = screen.getByRole('button', { name: /update employee/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(EmployeeService.updateEmployee).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          firstName: 'Jane',
        })
      )
      expect(mockHandlers.onSuccess).toHaveBeenCalledWith(updatedEmployee)
    })
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<EmployeeForm {...mockHandlers} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockHandlers.onCancel).toHaveBeenCalledOnce()
  })

  it('handles form submission error', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(EmployeeService.createEmployee).mockRejectedValue(new Error('API Error'))
    
    renderWithQueryClient(<EmployeeForm {...mockHandlers} />)

    // Fill out minimal required fields
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com')
    await user.type(screen.getByLabelText(/phone/i), '5551234567')
    await user.selectOptions(screen.getByLabelText(/department/i), 'Engineering')
    await user.selectOptions(screen.getByLabelText(/position/i), 'Software Engineer')
    await user.type(screen.getByLabelText(/salary/i), '75000')

    const submitButton = screen.getByRole('button', { name: /create employee/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error saving employee:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('loads departments and positions on mount', async () => {
    renderWithQueryClient(<EmployeeForm {...mockHandlers} />)

    await waitFor(() => {
      expect(EmployeeService.getDepartments).toHaveBeenCalled()
      expect(EmployeeService.getPositions).toHaveBeenCalled()
    })

    // Check that options are populated
    const departmentSelect = screen.getByLabelText(/department/i)
    expect(departmentSelect).toHaveTextContent('Engineering')
    expect(departmentSelect).toHaveTextContent('Marketing')

    const positionSelect = screen.getByLabelText(/position/i)
    expect(positionSelect).toHaveTextContent('Software Engineer')
    expect(positionSelect).toHaveTextContent('Marketing Manager')
  })
})