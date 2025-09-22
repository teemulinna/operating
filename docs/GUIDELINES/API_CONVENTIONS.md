## API Conventions (REST + WebSocket)

### Principles
- Resource-oriented REST; plural nouns, predictable paths
- Stable shapes; typed responses; minimal surprises

### Paths and Methods
- GET collection: `/api/<resource>`; GET item: `/api/<resource>/:id`
- POST create, PUT full update, PATCH partial, DELETE remove
- Action endpoints only when necessary: `/api/allocations/with-validation`

### Query & Pagination
- Pagination: `page`, `limit` (defaults page=1, limit=20)
- Filtering: explicit keys (`employeeId`, `departmentId`, `severity`)
- Sorting: `sortBy`, `sortOrder` (asc|desc)
- Date ranges: `dateFrom`, `dateTo` (ISO 8601)

### Request/Response Contract
- Success: `{ success: true, data, meta? }`
- Error: `{ success: false, message, code, details? }`
- Dates: ISO 8601 strings; numbers for amounts; booleans not strings

### Status Codes
- 200 OK, 201 Created, 204 No Content
- 400 Validation, 401 Unauthorized, 403 Forbidden, 404 Not Found
- 409 Conflict (e.g., capacity validation failed), 422 Unprocessable
- 500 Internal Error (sanitized message)

### Validation
- Zod schemas at edges (params/query/body); reject unknown fields
- Consistent error payload with `code` (e.g., `OVER_ALLOCATION`, `VALIDATION_FAILED`)

### Versioning
- Path-based when needed (`/api/v1/...`); Phase 1 can remain unversioned

### Caching
- Heat map GET endpoints: `Cache-Control: private, max-age=300`
- Consider ETag for heavy lists; clients respect 304

### WebSocket Conventions
- Namespaces: `capacity:*`, `warning:*`, `allocation:*`
- Events: `capacity:updated`, `warning:created|acknowledged|resolved`, `allocation:approved|rejected`
- Payload: `{ type, employeeId, timestamp, data }`

### Security
- JWT auth middleware; RBAC checks in controllers
- Rate limit sensitive routes (acknowledge/resolve, create allocation)

### OpenAPI
- Track Phase 1 endpoints in `docs/openapi.yaml` (follow-up task)


