## Frontend Guidelines (React + TS)

### State Management
- Server state: @tanstack/react-query (keys namespaced: ['capacity', 'heatmap', ...])
- Cross-view real-time UI: Zustand store slices (e.g., `capacityStore`)

### Data Fetching
- Centralize API calls in `/src/services/*.api.ts`
- Retry defaults off for validation endpoints; exponential backoff for others
- Set `staleTime`/`cacheTime` per feature (see PHASE1 specs)

### Components
- Container (data + wiring) vs Presentational (pure UI)
- Virtualize large grids (heatmaps) and lists
- Use controlled components for forms; Zod for client-side validation where helpful

### WebSocket Usage
- Hook wrapper: `useWebSocket` with typed events
- On events, invalidate or surgically update Query Cache

### UX Standards
- Loading: skeletons for heatmaps and tables
- Errors: inline error states with retry
- Accessibility: keyboard navigation in grids; tooltips have aria-labels

### Testing
- Component tests with RTL; hook tests for data hooks
- E2E critical flows per epic (Heatmaps, Availability, Scenarios)


