## Backend Guidelines (Express + TS)

### Project Structure
- controllers/ services/ repositories/ validation/ middleware/
- No business logic in controllers; keep thin

### Validation
- Zod schemas per route (`capacity.schemas.ts`); validate params, query, body

### Services
- Pure, testable; DI via service container; no direct Express types inside services

### Errors
- Throw typed errors; map to HTTP in error middleware; include `code`

### WebSocket
- Event taxonomy under `capacity:*`, `warning:*`, `allocation:*`
- Central handler publishes typed payloads

### Caching
- Prefer query-level caching + HTTP headers; Redis optional for heavy heatmap queries

### Security
- Auth middleware + RBAC checks at controller boundaries
- Rate limit sensitive endpoints (acknowledge/resolve, create allocation)

### Observability
- Structured logs; request IDs; basic metrics where available


