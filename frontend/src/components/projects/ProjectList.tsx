import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Download, Upload, Edit, Trash2, RefreshCw, AlertCircle, LayoutGrid, List, Calendar, DollarSign, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectListSkeleton } from './ProjectListSkeleton';
import { ProjectCard } from './ProjectCard';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import { useToast } from '@/components/ui/use-toast';
import { debounce } from '@/lib/utils';
import type { Project, ProjectFilters, ProjectPaginationParams } from '@/types/project';
import { PROJECT_STATUS_COLORS } from '@/types/project';

interface ProjectListProps {
  onProjectSelect?: (project: Project) => void;
  onProjectCreate?: () => void;
  onProjectEdit?: (project: Project) => void;
  onCSVImport?: () => void;
  onCSVExport?: () => void;
  initialSearchTerm?: string;
}

export function ProjectList({ 
  onProjectSelect, 
  onProjectCreate, 
  onProjectEdit,
  onCSVImport,
  onCSVExport,
  initialSearchTerm = ''
}: ProjectListProps) {
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [pagination, setPagination] = useState<ProjectPaginationParams>({
    page: 1,
    limit: 10,
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  
  const { data, isLoading, error, refetch, isRefetching } = useProjects(filters, pagination);
  const deleteProject = useDeleteProject();
  const { toast } = useToast();

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setFilters(prev => ({ ...prev, search: term }));
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFilters(prev => ({ ...prev, search: undefined }));
  };

  const handleSort = (field: keyof Project) => {
    setPagination(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({ 
      ...prev, 
      status: status === 'all' ? undefined : status as Project['status'] 
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (project: Project) => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      try {
        await deleteProject.mutateAsync(project.id);
        toast({
          title: 'Project Deleted',
          description: `${project.name} has been successfully deleted.`,
          variant: 'default'
        });
      } catch (error: any) {
        toast({
          title: 'Delete Failed',
          description: error.message || 'Unable to delete project. Please try again.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  // Show skeleton while initially loading
  if (isLoading && !data) {
    return <ProjectListSkeleton />;
  }

  // Error state with retry option
  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Unable to Load Projects
              </h3>
              <p className="text-gray-600 mb-4 max-w-md">
                {error.message || 'An unexpected error occurred while loading project data.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={onProjectCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  const isEmpty = data?.projects.length === 0 && !searchTerm;
  const noSearchResults = data?.projects.length === 0 && searchTerm;

  if (isEmpty) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Project Management</CardTitle>
              <CardDescription>
                Manage and track your organization's projects
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onCSVImport} variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button onClick={onProjectCreate} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No projects yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md">
                Get started by creating your first project or importing data from a CSV file.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={onProjectCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Project
                </Button>
                <Button onClick={onCSVImport} variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Project Management</CardTitle>
            <CardDescription>
              Manage and track your organization's projects
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="px-3"
              >
                <List className="mr-2 h-4 w-4" />
                Table View
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="px-3"
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Card View
              </Button>
            </div>
            
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm" 
              disabled={isRefetching}
              aria-label="Refresh"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={onCSVImport} variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={onCSVExport} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={onProjectCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          <Select onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            More Filters
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* No search results */}
        {noSearchResults ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No projects found
              </h3>
              <p className="text-gray-600 mb-4">
                No projects match your search for "<span className="font-medium">{searchTerm}</span>"
              </p>
              <Button 
                variant="outline" 
                onClick={clearSearch}
              >
                Clear Search
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Show loading overlay for subsequent loads */}
            {isRefetching && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            
            {/* Conditional view rendering based on viewMode */}
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="project-card-view">
                {data?.projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => onProjectSelect?.(project)}
                    onEdit={() => onProjectEdit?.(project)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              /* Table View */
              <div className="relative overflow-x-auto" data-testid="project-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('name')}
                      >
                        Project Name
                        {pagination.sortBy === 'name' && (
                          <span className="ml-1">
                            {pagination.sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('clientName')}
                      >
                        Client
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('status')}
                      >
                        Status
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('startDate')}
                      >
                        Start Date
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('budget')}
                      >
                        Budget
                      </TableHead>
                      <TableHead className="w-[140px]">
                        <div className="flex items-center">
                          <Users className="mr-1 h-3 w-3" />
                          Team
                        </div>
                      </TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.projects.map((project) => (
                      <TableRow 
                        key={project.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => onProjectSelect?.(project)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="font-semibold">{project.name}</span>
                            {project.description && (
                              <span className="text-sm text-gray-500 line-clamp-1">
                                {project.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{project.clientName}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            PROJECT_STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(project.startDate)}</TableCell>
                        <TableCell>{formatCurrency(project.budget)}</TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="mr-1 h-3 w-3" />
                            {project.teamMembersCount || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onProjectEdit?.(project);
                              }}
                              title="Edit project"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <LoadingButton
                              variant="ghost"
                              size="icon"
                              loading={deleteProject.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(project);
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Delete project"
                            >
                              <Trash2 className="h-4 w-4" />
                            </LoadingButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing {((data.page - 1) * data.limit) + 1} to {Math.min(data.page * data.limit, data.total)} of {data.total} projects
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.page - 1)}
                    disabled={data.page === 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                    const pageNum = data.page - 2 + i;
                    if (pageNum < 1 || pageNum > data.totalPages) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === data.page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.page + 1)}
                    disabled={data.page === data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}