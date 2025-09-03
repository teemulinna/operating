# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-09-03-employee-management/spec.md

> Created: 2025-09-03
> Version: 1.0.0

## API Endpoints

### Employee Management Endpoints

#### GET /api/employees
Retrieve employees with optional search and filtering parameters.

**HTTP Method:** `GET`  
**Authentication:** Required (Bearer Token)  
**Rate Limit:** 100 requests/minute

**Query Parameters:**
```typescript
interface EmployeesQueryParams {
  page?: number;           // Default: 1
  limit?: number;          // Default: 20, Max: 100
  search?: string;         // Search in name, email, employee_id
  department?: string[];   // Filter by department IDs
  skills?: string[];       // Filter by skill IDs
  status?: ('active' | 'inactive' | 'on-leave')[];
  availabilityStatus?: ('available' | 'unavailable' | 'limited')[];
  capacityMin?: number;    // Minimum weekly hours
  capacityMax?: number;    // Maximum weekly hours
  experienceLevel?: ('junior' | 'intermediate' | 'senior' | 'expert')[];
  sortBy?: 'firstName' | 'lastName' | 'department' | 'role' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
```

**Response Format:**
```typescript
interface EmployeesResponse {
  data: Employee[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: {
    departments: { id: string; name: string }[];
    skills: { id: string; name: string; category: string }[];
  };
}

interface Employee {
  id: string;
  employeeId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  employment: {
    department: { id: string; name: string };
    role: string;
    startDate: string;
    status: 'active' | 'inactive' | 'on-leave';
  };
  capacity: {
    weeklyHours: number;
    currentUtilization: number;
    availabilityStatus: 'available' | 'unavailable' | 'limited';
    notes?: string;
  };
  skills: {
    id: string;
    name: string;
    category: string;
    experienceLevel: 'junior' | 'intermediate' | 'senior' | 'expert';
    yearsOfExperience?: number;
  }[];
  createdAt: string;
  updatedAt: string;
}
```

**Error Responses:**
- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

#### POST /api/employees
Create a new employee record.

**HTTP Method:** `POST`  
**Authentication:** Required (HR Manager, Team Lead)  
**Content-Type:** `application/json`

**Request Body:**
```typescript
interface CreateEmployeeRequest {
  employeeId: string;      // Must be unique
  personalInfo: {
    firstName: string;     // Required, 1-100 chars
    lastName: string;      // Required, 1-100 chars
    email: string;         // Required, valid email, unique
    phone?: string;        // Optional, valid phone format
  };
  employment: {
    departmentId: string;  // Required, must exist in departments table
    role: string;          // Required, 1-100 chars
    startDate: string;     // Required, ISO date format
    status?: 'active' | 'inactive' | 'on-leave'; // Default: 'active'
  };
  capacity: {
    weeklyHours: number;   // Required, 0-80
    availabilityStatus?: 'available' | 'unavailable' | 'limited'; // Default: 'available'
    notes?: string;        // Optional capacity notes
  };
  skills?: {
    skillId: string;       // Must exist in skills table
    experienceLevel: 'junior' | 'intermediate' | 'senior' | 'expert';
    yearsOfExperience?: number; // Optional, >= 0
  }[];
}
```

**Response Format:**
```typescript
interface CreateEmployeeResponse {
  data: Employee;
  message: string;
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors, duplicate email/employeeId
- `401 Unauthorized` - Insufficient permissions
- `404 Not Found` - Referenced department/skill not found
- `422 Unprocessable Entity` - Business rule violations

---

#### GET /api/employees/:id
Retrieve a single employee by ID.

**HTTP Method:** `GET`  
**Authentication:** Required  
**Parameters:** `id` (UUID) - Employee ID

**Response Format:**
```typescript
interface EmployeeResponse {
  data: Employee;
}
```

**Error Responses:**
- `404 Not Found` - Employee not found
- `401 Unauthorized` - Missing authentication

---

#### PUT /api/employees/:id
Update an existing employee record.

**HTTP Method:** `PUT`  
**Authentication:** Required (HR Manager, Team Lead, or employee's manager)  
**Content-Type:** `application/json`

**Request Body:** Same as `CreateEmployeeRequest` but all fields optional except ID

**Response Format:**
```typescript
interface UpdateEmployeeResponse {
  data: Employee;
  message: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}
```

**Error Responses:**
- `404 Not Found` - Employee not found
- `400 Bad Request` - Validation errors
- `409 Conflict` - Email already exists (if changing email)

---

#### DELETE /api/employees/:id
Soft delete an employee (sets status to 'inactive').

**HTTP Method:** `DELETE`  
**Authentication:** Required (HR Manager only)

**Response Format:**
```typescript
interface DeleteEmployeeResponse {
  message: string;
  deletedAt: string;
}
```

**Error Responses:**
- `404 Not Found` - Employee not found
- `403 Forbidden` - Insufficient permissions
- `409 Conflict` - Cannot delete employee with active assignments

---

### Skills Management Endpoints

#### GET /api/skills
Retrieve all available skills with optional filtering.

**HTTP Method:** `GET`  
**Authentication:** Required

**Query Parameters:**
```typescript
interface SkillsQueryParams {
  category?: string;
  isActive?: boolean;
  search?: string;
}
```

**Response Format:**
```typescript
interface SkillsResponse {
  data: {
    id: string;
    name: string;
    category: string;
    description?: string;
    isActive: boolean;
  }[];
}
```

---

#### POST /api/skills
Create a new skill.

**HTTP Method:** `POST`  
**Authentication:** Required (HR Manager)

**Request Body:**
```typescript
interface CreateSkillRequest {
  name: string;          // Required, unique
  category: string;      // Required
  description?: string;
  isActive?: boolean;    // Default: true
}
```

---

### Departments Management Endpoints

#### GET /api/departments
Retrieve all departments.

**HTTP Method:** `GET`  
**Authentication:** Required

**Response Format:**
```typescript
interface DepartmentsResponse {
  data: {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
  }[];
}
```

---

### Bulk Operations Endpoints

#### POST /api/employees/bulk/import
Import employees from CSV file.

**HTTP Method:** `POST`  
**Authentication:** Required (HR Manager)  
**Content-Type:** `multipart/form-data`

**Request Body:**
- `file`: CSV file (max 10MB)
- `skipDuplicates`: boolean (optional, default: false)
- `updateExisting`: boolean (optional, default: false)

**CSV Format:**
```csv
employeeId,firstName,lastName,email,phone,department,role,startDate,weeklyHours
EMP001,John,Doe,john.doe@company.com,555-0123,Engineering,Software Engineer,2024-01-15,40
```

**Response Format:**
```typescript
interface BulkImportResponse {
  message: string;
  summary: {
    totalRows: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  errors?: {
    row: number;
    error: string;
    data: any;
  }[];
  data: Employee[];
}
```

---

#### GET /api/employees/bulk/export
Export employees to CSV format.

**HTTP Method:** `GET`  
**Authentication:** Required  
**Query Parameters:** Same as `GET /api/employees` for filtering

**Response:**
- `Content-Type`: `text/csv`
- `Content-Disposition`: `attachment; filename="employees_export_YYYY-MM-DD.csv"`

---

### Capacity Management Endpoints

#### PUT /api/employees/:id/capacity
Update employee capacity and availability.

**HTTP Method:** `PUT`  
**Authentication:** Required (Team Lead, HR Manager)

**Request Body:**
```typescript
interface UpdateCapacityRequest {
  weeklyHours?: number;     // 0-80
  availabilityStatus?: 'available' | 'unavailable' | 'limited';
  notes?: string;
  reason?: string;          // Reason for capacity change
}
```

**Response Format:**
```typescript
interface UpdateCapacityResponse {
  data: {
    capacity: Employee['capacity'];
    historyEntry: {
      id: string;
      changes: any[];
      reason?: string;
      changedAt: string;
    };
  };
  message: string;
}
```

---

#### GET /api/capacity/summary
Get capacity summary for dashboard.

**HTTP Method:** `GET`  
**Authentication:** Required  
**Query Parameters:**
```typescript
interface CapacitySummaryParams {
  departmentId?: string;
  includeInactive?: boolean;
}
```

**Response Format:**
```typescript
interface CapacitySummaryResponse {
  data: {
    totalEmployees: number;
    totalCapacity: number;
    totalUtilization: number;
    averageUtilization: number;
    byDepartment: {
      departmentId: string;
      departmentName: string;
      employeeCount: number;
      totalCapacity: number;
      totalUtilization: number;
    }[];
    byAvailabilityStatus: {
      available: number;
      unavailable: number;
      limited: number;
    };
  };
}
```

---

### Audit and History Endpoints

#### GET /api/employees/:id/history
Get change history for an employee.

**HTTP Method:** `GET`  
**Authentication:** Required

**Query Parameters:**
```typescript
interface HistoryQueryParams {
  field?: string;        // Filter by specific field changes
  limit?: number;        // Default: 50
  offset?: number;       // Default: 0
}
```

**Response Format:**
```typescript
interface EmployeeHistoryResponse {
  data: {
    id: string;
    employeeId: string;
    fieldName: string;
    oldValue: any;
    newValue: any;
    reason?: string;
    changedBy?: string;   // Future: user who made change
    createdAt: string;
  }[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}
```

## Controller Logic

### Authentication Middleware

```typescript
// auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'hr_manager' | 'team_lead' | 'project_manager';
    permissions: string[];
  };
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};
```

### Request Validation Middleware

```typescript
// validation.middleware.ts
import { body, query, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

export const validateEmployeeCreation = [
  body('employeeId').isLength({ min: 1, max: 50 }).matches(/^[A-Z0-9-]+$/),
  body('personalInfo.firstName').isLength({ min: 1, max: 100 }).trim(),
  body('personalInfo.lastName').isLength({ min: 1, max: 100 }).trim(),
  body('personalInfo.email').isEmail().normalizeEmail(),
  body('personalInfo.phone').optional().matches(/^\+?[\d\s\-\(\)]+$/),
  body('employment.departmentId').isUUID(),
  body('employment.role').isLength({ min: 1, max: 100 }),
  body('employment.startDate').isISO8601(),
  body('capacity.weeklyHours').isFloat({ min: 0, max: 80 }),
  body('skills.*.skillId').isUUID(),
  body('skills.*.experienceLevel').isIn(['junior', 'intermediate', 'senior', 'expert']),
  handleValidationErrors
];

export const validateEmployeeQuery = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isLength({ max: 255 }),
  query('capacityMin').optional().isFloat({ min: 0 }),
  query('capacityMax').optional().isFloat({ max: 80 }),
  handleValidationErrors
];
```

### Error Handling Middleware

```typescript
// error.middleware.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

### Rate Limiting Configuration

```typescript
// rate-limit.config.ts
import rateLimit from 'express-rate-limit';

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const bulkOperationsRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit bulk operations to 5 per hour
  message: {
    error: 'Too many bulk operations, please try again later.',
  },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit login attempts
  skipSuccessfulRequests: true,
});
```

### Main Employee Controller

```typescript
// controllers/employees.controller.ts
import { Request, Response } from 'express';
import { EmployeeService } from '../services/employee.service';
import { AppError, asyncHandler } from '../middleware/error.middleware';

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string; permissions: string[] };
}

export class EmployeesController {
  private employeeService: EmployeeService;

  constructor() {
    this.employeeService = new EmployeeService();
  }

  getEmployees = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      search: req.query.search as string,
      department: req.query.department as string[],
      skills: req.query.skills as string[],
      status: req.query.status as string[],
      availabilityStatus: req.query.availabilityStatus as string[],
      capacityMin: parseFloat(req.query.capacityMin as string),
      capacityMax: parseFloat(req.query.capacityMax as string),
      experienceLevel: req.query.experienceLevel as string[],
      sortBy: req.query.sortBy as string || 'firstName',
      sortOrder: req.query.sortOrder as string || 'asc'
    };

    const result = await this.employeeService.getEmployees(filters);
    
    res.json({
      data: result.employees,
      meta: result.meta,
      filters: result.availableFilters
    });
  });

  createEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const employeeData = req.body;
    
    // Check for duplicate email/employeeId
    const existingEmployee = await this.employeeService.findByEmailOrEmployeeId(
      employeeData.personalInfo.email,
      employeeData.employeeId
    );
    
    if (existingEmployee) {
      throw new AppError('Employee with this email or ID already exists', 400);
    }

    const newEmployee = await this.employeeService.createEmployee({
      ...employeeData,
      createdBy: req.user?.id
    });

    res.status(201).json({
      data: newEmployee,
      message: 'Employee created successfully'
    });
  });

  getEmployeeById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const employee = await this.employeeService.getEmployeeById(id);
    
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    res.json({ data: employee });
  });

  updateEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const existingEmployee = await this.employeeService.getEmployeeById(id);
    if (!existingEmployee) {
      throw new AppError('Employee not found', 404);
    }

    // Check email uniqueness if email is being updated
    if (updateData.personalInfo?.email && 
        updateData.personalInfo.email !== existingEmployee.personalInfo.email) {
      const duplicateEmail = await this.employeeService.findByEmail(updateData.personalInfo.email);
      if (duplicateEmail) {
        throw new AppError('Email address already in use', 409);
      }
    }

    const result = await this.employeeService.updateEmployee(id, {
      ...updateData,
      updatedBy: req.user?.id
    });

    res.json({
      data: result.employee,
      message: 'Employee updated successfully',
      changes: result.changes
    });
  });

  deleteEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const employee = await this.employeeService.getEmployeeById(id);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Soft delete - set status to inactive
    const result = await this.employeeService.softDeleteEmployee(id, req.user?.id);

    res.json({
      message: 'Employee deactivated successfully',
      deletedAt: result.deletedAt
    });
  });

  updateCapacity = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { weeklyHours, availabilityStatus, notes, reason } = req.body;

    const result = await this.employeeService.updateCapacity(id, {
      weeklyHours,
      availabilityStatus,
      notes,
      reason,
      changedBy: req.user?.id
    });

    res.json({
      data: result,
      message: 'Employee capacity updated successfully'
    });
  });

  bulkImport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('CSV file is required', 400);
    }

    const options = {
      skipDuplicates: req.body.skipDuplicates === 'true',
      updateExisting: req.body.updateExisting === 'true',
      importedBy: req.user?.id
    };

    const result = await this.employeeService.bulkImportFromCSV(req.file.buffer, options);

    res.json(result);
  });

  exportToCSV = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query;
    
    const csvData = await this.employeeService.exportToCSV(filters);
    
    const filename = `employees_export_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  });
}
```

## Response Formats

### Standard Success Response
```typescript
interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}
```

### Standard Error Response
```typescript
interface ErrorResponse {
  error: string;
  details?: any[];
  timestamp?: string;
  path?: string;
  statusCode?: number;
}
```

### Validation Error Response
```typescript
interface ValidationErrorResponse {
  error: 'Validation failed';
  details: {
    field: string;
    message: string;
    value?: any;
  }[];
}
```

## Error Handling

### HTTP Status Codes

- **200 OK** - Successful GET, PUT requests
- **201 Created** - Successful POST requests
- **204 No Content** - Successful DELETE requests
- **400 Bad Request** - Invalid request data/parameters
- **401 Unauthorized** - Missing or invalid authentication
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **409 Conflict** - Duplicate email/employeeId
- **422 Unprocessable Entity** - Business rule violations
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Unexpected server errors

### Error Response Examples

**Validation Error:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "personalInfo.email",
      "message": "Invalid email format",
      "value": "invalid-email"
    }
  ]
}
```

**Business Logic Error:**
```json
{
  "error": "Employee with this email already exists",
  "statusCode": 409
}
```

**Authentication Error:**
```json
{
  "error": "Access denied. No token provided.",
  "statusCode": 401
}
```

This API specification provides comprehensive endpoints for all employee management operations with proper authentication, validation, error handling, and response formatting following REST conventions and TypeScript best practices.