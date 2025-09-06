import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import EmployeeService from '@/services/api';
import type { Employee, EmployeeFilters, PaginationParams } from '@/types/employee';
import { debounce } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

const DEBOUNCE_DELAY = 300;
const DEFAULT_PAGINATION_LIMIT = 10;

export function useManagedEmployees() {
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: DEFAULT_PAGINATION_LIMIT,
    sortBy: 'firstName',
    sortOrder: 'asc',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['employees', filters, pagination],
    queryFn: () => EmployeeService.getEmployees(filters, pagination),
    placeholderData: (previousData) => previousData
  });

  const { mutateAsync: deleteEmployee, isPending } = useMutation({
    mutationFn: EmployeeService.deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });

  const debouncedSearch = useMemo(
    () =>
      debounce((term: string) => {
        setFilters((prev) => ({ ...prev, search: term }));
        setPagination((prev) => ({ ...prev, page: 1 }));
      }, DEBOUNCE_DELAY),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleSort = (field: keyof Employee) => {
    setPagination((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleDeleteRequest = (employee: Employee) => {
    setEmployeeToDelete(employee);
  };

  const handleDeleteConfirm = async () => {
    if (employeeToDelete) {
      try {
        await deleteEmployee(employeeToDelete.id);
        toast({
          title: 'Employee Deleted',
          description: `${employeeToDelete.firstName} ${employeeToDelete.lastName} has been removed from the system.`,
          variant: 'success',
        });
      } catch (error) {
        toast({
          title: 'Delete Failed',
          description: 'Unable to delete employee. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setEmployeeToDelete(null);
      }
    }
  };

  const handleDeleteCancel = () => {
    setEmployeeToDelete(null);
  };

  const handleRefresh = () => {
    refetch();
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFilters((prev) => ({ ...prev, search: undefined }));
  };

  return {
    // State
    employees: data?.employees || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    isLoading,
    isRefetching,
    error,
    pagination,
    searchTerm,
    employeeToDelete,
    isDeleting: isPending,

    // Handlers
    handleSearchChange,
    handleSort,
    handlePageChange,
    handleDeleteRequest,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleRefresh,
    clearSearch,

    // Mutations
    deleteEmployee,
  };
}
