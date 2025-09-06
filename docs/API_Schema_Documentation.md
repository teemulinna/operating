# API Schema Documentation

## Overview

This document provides detailed schema definitions and data contracts for the project and resource management APIs implemented following Test-Driven Development methodology.

## 📋 Core Data Types

### Project Schema
```typescript
interface Project {
  id: string;
  name: string;                    // Required, unique, max 255 chars
  description?: string;            // Optional, max 1000 chars
  clientName?: string;             // Optional, max 255 chars
  status: ProjectStatus;           // Required, enum validation
  startDate: Date;                 // Required, ISO 8601 format
  endDate: Date;                   // Required, must be after startDate
  budget?: number;                 // Optional, must be positive
  hourlyRate?: number;             // Optional, must be positive
  createdBy?: number;              // Optional, user ID reference
  createdAt: Date;                 // Auto-generated timestamp
  updatedAt: Date;                 // Auto-updated timestamp
}

enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active', 
  ON_HOLD = 'on-hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
```

### Resource Allocation Schema
```typescript
interface ResourceAllocation {
  id: string;
  projectId: string;               // Required, references Project.id
  employeeId: string;              // Required, references Employee.id  
  allocatedHours: number;          // Required, 0.1 - 1000 hours
  hourlyRate?: number;             // Optional, must be positive
  roleOnProject: string;           // Required, max 255 chars
  startDate: Date;                 // Required, within project timeline
  endDate: Date;                   // Required, after startDate
  actualHours?: number;            // Optional, for completed allocations
  notes?: string;                  // Optional, max 1000 chars
  isActive: boolean;               // Required, defaults to true
  createdAt: Date;                 // Auto-generated timestamp
  updatedAt: Date;                 // Auto-updated timestamp
}

enum AllocationStatus {
  TENTATIVE = 'tentative',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed', 
  CANCELLED = 'cancelled'
}
```

### Employee Schema (Reference)
```typescript
interface Employee {
  id: string;
  name: string;                    // Required
  email: string;                   // Required, unique
  position: string;                // Required
  departmentId: string;            // Required, references Department.id
  hireDate: Date;                  // Required
  isActive: boolean;               // Required, defaults to true
  createdAt: Date;                 // Auto-generated
  updatedAt: Date;                 // Auto-updated
}
```

## 🔍 API Request/Response Schemas

### Project Creation Request
```typescript
interface CreateProjectRequest {
  name: string;                    // Required, 1-255 chars
  description?: string;            // Optional, max 1000 chars
  clientName?: string;             // Optional, max 255 chars
  status?: ProjectStatus;          // Optional, defaults to 'planning'
  startDate: string;               // Required, ISO 8601 date
  endDate: string;                 // Required, ISO 8601 date
  budget?: number;                 // Optional, positive number
  hourlyRate?: number;             // Optional, positive number
  createdBy?: number;              // Optional, user ID
}

// Validation Rules:
// - name: required, unique, trim whitespace
// - endDate must be after startDate
// - budget must be >= 0 if provided
// - hourlyRate must be >= 0 if provided
// - status must be valid enum value
```

### Project Update Request
```typescript
interface UpdateProjectRequest {
  name?: string;                   // Optional, 1-255 chars, unique
  description?: string;            // Optional, max 1000 chars
  clientName?: string;             // Optional, max 255 chars
  status?: ProjectStatus;          // Optional, valid transition required
  startDate?: string;              // Optional, ISO 8601 date
  endDate?: string;                // Optional, ISO 8601 date
  budget?: number;                 // Optional, positive number
  hourlyRate?: number;             // Optional, positive number
}

// Business Rules:
// - Status transitions validated (see status transition matrix)
// - Date range consistency maintained
// - Existing allocations considered for date changes
```

### Resource Allocation Request
```typescript
interface CreateAllocationRequest {
  employeeId: string;              // Required, valid employee ID
  projectId: string;               // Required, valid project ID  
  allocatedHours: number;          // Required, 0.1-1000 range
  roleOnProject: string;           // Required, 1-255 chars
  startDate: string;               // Required, ISO 8601 date
  endDate: string;                 // Required, ISO 8601 date
  hourlyRate?: number;             // Optional, positive number
  notes?: string;                  // Optional, max 1000 chars
  force?: boolean;                 // Optional, override conflicts
}

// Business Validation:
// - Employee must exist and be active
// - Project must exist and be active
// - Date range must be within project timeline  
// - No scheduling conflicts unless force=true
// - Capacity validation (prevent >100% allocation)
```

## 📊 Response Schemas

### Standard Success Response
```typescript
interface APISuccessResponse<T> {
  success: true;
  data: T;
  message: string;
  pagination?: {
    page: number;
    limit: number; 
    total: number;
    totalPages: number;
  };
}
```

### Standard Error Response
```typescript
interface APIErrorResponse {
  success: false;
  error: string;                   // Error category
  message: string;                 // Human-readable description
  details?: ValidationError[];     // Field-specific validation errors
}

interface ValidationError {
  field: string;                   // Field name that failed validation
  message: string;                 // Specific error message
  value: any;                      // The invalid value provided
}
```

### Conflict Detection Response
```typescript
interface ConflictDetectionResponse {
  hasConflicts: boolean;
  conflicts: ConflictDetail[];
  suggestions: string[];
}

interface ConflictDetail {
  allocationId: string;
  projectName: string;
  startDate: Date;
  endDate: Date;
  allocatedHours: number;
  overlapDays: number;
}
```

### Capacity Validation Response
```typescript
interface CapacityValidationResponse {
  isValid: boolean;
  warnings: string[];
  maxCapacityHours: number;
  currentAllocatedHours: number;
  utilizationRate: number;        // Percentage (0-100+)
  recommendations?: string[];
}
```

## 🎯 Query Parameters

### Project List Filters
```typescript
interface ProjectQueryParams {
  page?: number;                   // Default: 1
  limit?: number;                  // Default: 50, max: 100
  sortBy?: string;                 // Default: 'created_at'
  sortOrder?: 'ASC' | 'DESC';      // Default: 'DESC'
  status?: ProjectStatus;          // Filter by status
  clientName?: string;             // Filter by client
  startDateFrom?: string;          // ISO 8601 date
  startDateTo?: string;            // ISO 8601 date
  endDateFrom?: string;            // ISO 8601 date
  endDateTo?: string;              // ISO 8601 date
}
```

### Allocation List Filters
```typescript
interface AllocationQueryParams {
  page?: number;                   // Default: 1
  limit?: number;                  // Default: 50, max: 100
  employeeId?: string;             // Filter by employee
  projectId?: string;              // Filter by project
  startDateFrom?: string;          // ISO 8601 date
  startDateTo?: string;            // ISO 8601 date
  endDateFrom?: string;            // ISO 8601 date
  endDateTo?: string;              // ISO 8601 date
  isActive?: boolean;              // Filter by active status
  includeDetails?: boolean;        // Include employee/project details
}
```

## 🚦 HTTP Status Codes

### Success Codes
- `200 OK` - Successful GET, PUT operations
- `201 Created` - Successful POST operations
- `204 No Content` - Successful DELETE operations

### Client Error Codes  
- `400 Bad Request` - Validation errors, invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Business rule violations, scheduling conflicts
- `422 Unprocessable Entity` - Semantic errors

### Server Error Codes
- `500 Internal Server Error` - Unexpected server errors
- `503 Service Unavailable` - Temporary service issues

## 🔄 Business Rules Matrix

### Project Status Transitions
| From      | To                           | Allowed |
|-----------|------------------------------|---------|
| Planning  | Active, On-Hold             | ✅      |
| Active    | On-Hold, Completed          | ✅      |
| On-Hold   | Active, Planning            | ✅      |
| Completed | (none)                      | ❌      |
| Cancelled | (none)                      | ❌      |

### Allocation Validation Rules

#### Date Validation:
- Allocation dates must be within project start/end dates
- End date must be after start date
- Cannot create allocations for completed projects

#### Capacity Validation:
- Maximum 40 hours per week per employee (configurable)
- Warning at >80% utilization
- Error at >100% utilization (unless forced)
- Consider existing allocations in date range

#### Skills Validation:
- Employee skills should match project requirements
- Warning for skill mismatches
- Skills gap analysis for recommendations

## 📈 Performance Considerations

### Database Indexes
```sql
-- Projects
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX idx_projects_client ON projects(client_name);

-- Allocations  
CREATE INDEX idx_allocations_employee ON allocations(employee_id);
CREATE INDEX idx_allocations_project ON allocations(project_id);
CREATE INDEX idx_allocations_dates ON allocations(start_date, end_date);
CREATE INDEX idx_allocations_active ON allocations(is_active);
```

### Query Optimization
- Use `LIMIT` for pagination to prevent large result sets
- Filter by date ranges using indexed columns
- Use `EXISTS` instead of `IN` for subqueries where appropriate
- Consider prepared statements for frequent queries

## 🔐 Security Considerations

### Input Validation
- All user inputs validated using express-validator
- SQL injection prevention through parameterized queries
- XSS prevention through input sanitization
- File upload restrictions (if applicable)

### Authentication & Authorization
- JWT token validation on protected endpoints
- Role-based access control (RBAC) ready
- Rate limiting per IP/user
- CORS configuration for cross-origin requests

### Data Privacy
- Sensitive data logging restrictions
- PII handling compliance
- Audit trail for sensitive operations
- Data retention policies

This comprehensive schema documentation ensures that all API consumers have clear, unambiguous specifications for integrating with the project and resource management system.