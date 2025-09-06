# API Specification - Project-Resource Integration

> Created: 2025-09-06
> Version: 2.0.0
> Base URL: `/api/v2`

## Overview

This API specification extends the existing Employee Management API with comprehensive project-resource management capabilities. All endpoints follow RESTful conventions and include proper error handling, validation, and pagination.

## Authentication & Authorization

All endpoints require authentication via JWT tokens. Role-based permissions:
- **Admin**: Full access to all endpoints
- **Manager**: Read/write access to projects and assignments in their scope
- **Employee**: Read access to own assignments, limited project visibility

## Project Management Endpoints

### Projects

#### Create Project
```typescript
POST /api/projects
Content-Type: application/json
Authorization: Bearer <jwt_token>

Request Body:
{
  "code": "PROJ-2025-001",
  "name": "E-commerce Platform Redesign",
  "description": "Complete redesign of the customer-facing e-commerce platform",
  "clientName": "TechCorp Inc",
  "startDate": "2025-09-15",
  "endDate": "2025-12-15",
  "budget": 250000.00,
  "currencyCode": "USD",
  "estimatedHours": 2000,
  "priority": "high"
}

Response: 201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "PROJ-2025-001",
  "name": "E-commerce Platform Redesign",
  "description": "Complete redesign of the customer-facing e-commerce platform",
  "clientName": "TechCorp Inc",
  "startDate": "2025-09-15",
  "endDate": "2025-12-15",
  "status": "planning",
  "priority": "high",
  "budget": 250000.00,
  "currencyCode": "USD",
  "estimatedHours": 2000,
  "actualHours": 0,
  "createdAt": "2025-09-06T10:00:00Z",
  "updatedAt": "2025-09-06T10:00:00Z"
}
```

#### List Projects
```typescript
GET /api/projects?status=active&priority=high&page=1&limit=20&search=ecommerce

Response: 200 OK
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "code": "PROJ-2025-001",
      "name": "E-commerce Platform Redesign",
      "status": "active",
      "priority": "high",
      "startDate": "2025-09-15",
      "endDate": "2025-12-15",
      "assignedEmployees": 5,
      "totalRoles": 8,
      "filledRoles": 5,
      "utilization": 62.5,
      "budget": 250000.00,
      "actualHours": 145.5
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 45,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Project Roles

#### Add Role to Project
```typescript
POST /api/projects/550e8400-e29b-41d4-a716-446655440000/roles

Request Body:
{
  "roleName": "Senior React Developer",
  "description": "Lead frontend development using React and TypeScript",
  "requiredSkills": ["react", "typescript", "node.js"],
  "minimumExperienceLevel": "senior",
  "startDate": "2025-09-15",
  "endDate": "2025-11-30",
  "plannedAllocationPercentage": 80,
  "estimatedHours": 400,
  "hourlyRate": 95.00
}

Response: 201 Created
{
  "id": "role-123",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "roleName": "Senior React Developer",
  "description": "Lead frontend development using React and TypeScript",
  "requiredSkills": [
    {
      "id": "skill-react",
      "name": "React",
      "category": "Frontend"
    }
  ],
  "minimumExperienceLevel": "senior",
  "startDate": "2025-09-15",
  "endDate": "2025-11-30",
  "plannedAllocationPercentage": 80,
  "estimatedHours": 400,
  "hourlyRate": 95.00,
  "isFilled": false,
  "filledBy": null
}
```

## Resource Management Endpoints

### Resource Assignments

#### Assign Employee to Project
```typescript
POST /api/projects/550e8400-e29b-41d4-a716-446655440000/assignments

Request Body:
{
  "employeeId": "emp-456",
  "projectRoleId": "role-123",
  "assignmentType": "employee",
  "startDate": "2025-09-15",
  "endDate": "2025-11-30",
  "plannedAllocationPercentage": 75,
  "hourlyRate": 95.00,
  "confidenceLevel": "confirmed",
  "notes": "Primary React developer for frontend components"
}

Response: 201 Created
{
  "id": "assignment-789",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "employeeId": "emp-456",
  "employee": {
    "id": "emp-456",
    "firstName": "Sarah",
    "lastName": "Johnson",
    "email": "sarah.johnson@company.com",
    "role": "Senior Frontend Developer",
    "skills": ["React", "TypeScript", "Node.js"]
  },
  "projectRoleId": "role-123",
  "assignmentType": "employee",
  "startDate": "2025-09-15",
  "endDate": "2025-11-30",
  "plannedAllocationPercentage": 75,
  "plannedHoursPerWeek": 30,
  "hourlyRate": 95.00,
  "status": "planned",
  "confidenceLevel": "confirmed",
  "notes": "Primary React developer for frontend components"
}
```

#### Get Employee Assignments (Multi-Project View)
```typescript
GET /api/employees/emp-456/assignments?includeCompleted=false

Response: 200 OK
{
  "employeeId": "emp-456",
  "employee": {
    "firstName": "Sarah",
    "lastName": "Johnson",
    "weeklyHours": 40,
    "currentUtilization": 87.5
  },
  "assignments": [
    {
      "id": "assignment-789",
      "project": {
        "id": "project-1",
        "code": "PROJ-2025-001",
        "name": "E-commerce Platform Redesign"
      },
      "startDate": "2025-09-15",
      "endDate": "2025-11-30",
      "plannedAllocationPercentage": 75,
      "status": "active"
    },
    {
      "id": "assignment-790",
      "project": {
        "id": "project-2",
        "code": "PROJ-2025-002", 
        "name": "Mobile App Development"
      },
      "startDate": "2025-10-01",
      "endDate": "2025-12-15",
      "plannedAllocationPercentage": 25,
      "status": "planned"
    }
  ],
  "totalUtilization": 100,
  "conflicts": [
    {
      "date": "2025-10-01",
      "totalAllocation": 100,
      "status": "at-capacity"
    }
  ]
}
```

## Resource Planning & Optimization

### Capacity Planning
```typescript
GET /api/resources/availability?startDate=2025-09-15&endDate=2025-10-15&skills[]=react&skills[]=typescript&experienceLevel=senior

Response: 200 OK
{
  "dateRange": {
    "startDate": "2025-09-15",
    "endDate": "2025-10-15"
  },
  "availableResources": [
    {
      "employeeId": "emp-456",
      "employee": {
        "firstName": "Sarah",
        "lastName": "Johnson",
        "role": "Senior Frontend Developer",
        "experienceLevel": "senior",
        "matchingSkills": ["React", "TypeScript"]
      },
      "availability": {
        "currentUtilization": 60,
        "availableCapacity": 40,
        "availableHoursPerWeek": 16,
        "conflicts": []
      }
    }
  ],
  "summary": {
    "totalAvailableEmployees": 3,
    "totalAvailableCapacity": 120,
    "averageUtilization": 73
  }
}
```

### Resource Conflicts
```typescript
GET /api/resources/conflicts?status=detected&startDate=2025-09-01

Response: 200 OK
{
  "conflicts": [
    {
      "id": "conflict-123",
      "employeeId": "emp-456",
      "employee": {
        "firstName": "Sarah",
        "lastName": "Johnson"
      },
      "conflictDate": "2025-10-01",
      "totalAllocationPercentage": 125,
      "conflictingAssignments": [
        {
          "assignmentId": "assignment-789",
          "project": {
            "code": "PROJ-2025-001",
            "name": "E-commerce Platform"
          },
          "allocationPercentage": 75
        },
        {
          "assignmentId": "assignment-790", 
          "project": {
            "code": "PROJ-2025-002",
            "name": "Mobile App"
          },
          "allocationPercentage": 50
        }
      ],
      "status": "detected",
      "detectedAt": "2025-09-06T10:30:00Z"
    }
  ]
}
```

### Resource Optimization
```typescript
POST /api/resources/optimize

Request Body:
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "optimizationGoal": "minimize_cost", // or "maximize_skills_match", "balance_workload"
  "constraints": {
    "maxUtilization": 85,
    "requiredSkills": ["react", "typescript"],
    "preferredEmployees": ["emp-456"]
  }
}

Response: 200 OK
{
  "optimizationId": "opt-123",
  "recommendations": [
    {
      "action": "reassign",
      "currentAssignment": {
        "employeeId": "emp-789",
        "allocationPercentage": 100
      },
      "recommendedAssignment": {
        "employeeId": "emp-456",
        "allocationPercentage": 75
      },
      "reason": "Better skills match and reduces over-allocation",
      "impact": {
        "costSaving": 2400.00,
        "skillsMatchImprovement": 15,
        "utilizationImprovement": -25
      }
    }
  ],
  "summary": {
    "totalCostSaving": 2400.00,
    "averageUtilizationImprovement": 8,
    "conflictsResolved": 2
  }
}
```

## Time Tracking & Reporting

### Time Entries
```typescript
POST /api/assignments/assignment-789/time-entries

Request Body:
{
  "workDate": "2025-09-15",
  "hoursWorked": 7.5,
  "description": "Implemented user authentication components",
  "billable": true
}

Response: 201 Created
{
  "id": "time-entry-123",
  "resourceAssignmentId": "assignment-789",
  "employeeId": "emp-456",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "workDate": "2025-09-15",
  "hoursWorked": 7.5,
  "description": "Implemented user authentication components",
  "billable": true,
  "approved": false
}
```

### Planned vs Actual Reports
```typescript
GET /api/reports/planned-vs-actual/550e8400-e29b-41d4-a716-446655440000?period=monthly

Response: 200 OK
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "project": {
    "code": "PROJ-2025-001",
    "name": "E-commerce Platform Redesign"
  },
  "reportPeriod": "2025-09",
  "summary": {
    "plannedHours": 320,
    "actualHours": 298,
    "variance": -22,
    "variancePercentage": -6.9,
    "efficiency": 106.8
  },
  "byEmployee": [
    {
      "employeeId": "emp-456",
      "employee": {
        "firstName": "Sarah",
        "lastName": "Johnson"
      },
      "plannedHours": 120,
      "actualHours": 115,
      "variance": -5,
      "variancePercentage": -4.2
    }
  ],
  "trends": {
    "weeklyData": [
      {
        "week": "2025-09-15",
        "plannedHours": 80,
        "actualHours": 75
      }
    ]
  }
}
```

## Error Handling

### Standard Error Response Format
```typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "plannedAllocationPercentage",
        "message": "Must be between 1 and 100",
        "value": 150
      }
    ],
    "timestamp": "2025-09-06T10:00:00Z",
    "requestId": "req-123"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400): Request validation failed
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Business logic conflict (e.g., resource over-allocation)
- `UNPROCESSABLE_ENTITY` (422): Business rule violation
- `INTERNAL_SERVER_ERROR` (500): Server error

### Resource-Specific Error Codes
- `RESOURCE_OVER_ALLOCATED` (409): Employee allocation exceeds capacity
- `SKILL_MISMATCH` (422): Employee skills don't match role requirements
- `DATE_CONFLICT` (409): Assignment dates conflict with project timeline
- `PROJECT_INACTIVE` (422): Cannot assign to inactive project
- `EMPLOYEE_UNAVAILABLE` (422): Employee not available during requested period

## Rate Limiting

- **Standard endpoints**: 100 requests per minute per user
- **Report endpoints**: 10 requests per minute per user
- **Optimization endpoints**: 5 requests per minute per user

## Pagination

All list endpoints support pagination with query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field (default varies by endpoint)
- `order`: Sort order (`asc` or `desc`, default: `asc`)

## Filtering & Search

Most list endpoints support filtering and search:
- Text search: `search=query`
- Date ranges: `startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- Status filters: `status[]=active&status[]=planned`
- Skill filters: `skills[]=react&skills[]=typescript`

This API provides comprehensive project-resource management capabilities while maintaining compatibility with existing employee management functionality.