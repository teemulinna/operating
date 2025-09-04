# Employee Management API

A comprehensive Express.js REST API for managing employees, departments, and skills with TypeScript, MongoDB, JWT authentication, and full CRUD operations.

## Features

- **Employee Directory**: View, search, and filter employees
- **CRUD Operations**: Create, read, update, and delete employee records
- **Advanced Search**: Filter by department, position, status, salary range, and dates
- **CSV Import/Export**: Bulk import/export employee data
- **Responsive Design**: Mobile-friendly interface
- **Form Validation**: Robust client-side validation with Zod
- **Real-time Updates**: React Query for efficient data fetching and caching
- **Error Handling**: Comprehensive error boundaries and user feedback

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with Shadcn/ui components
- **State Management**: React Query (TanStack Query) 
- **Form Management**: React Hook Form with Zod validation
- **Routing**: React Router v6
- **Testing**: Vitest, React Testing Library
- **Build Tool**: Vite
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API server running (see backend documentation)

## Getting Started

### Installation

1. Clone the repository and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
VITE_API_URL=http://localhost:3001/api
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

### Testing

Run tests:
```bash
npm run test
```

Run tests with UI:
```bash
npm run test:ui
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Linting

Run ESLint:
```bash
npm run lint
```

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Shadcn/ui components
│   │   └── employees/    # Employee-specific components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API services
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   ├── App.tsx           # Main App component
│   └── main.tsx          # Application entry point
├── tests/                # Test files
└── package.json          # Dependencies and scripts
```

## Key Components

### EmployeeList
- Main component displaying the employee directory
- Includes search, filtering, sorting, and pagination
- Handles CSV export and employee actions

### EmployeeDialog
- Modal component for creating, editing, and viewing employees
- Form validation with Zod schema
- Dynamic form fields based on mode (create/edit/view)

### CSVImportDialog
- Handles CSV file upload and import
- Validates file format and size
- Provides user feedback and error reporting

## API Integration

The frontend communicates with the backend API through:
- **EmployeeService**: Centralized API service layer
- **React Query Hooks**: Efficient data fetching and caching
- **Error Handling**: Axios interceptors for global error management

## Form Validation

Employee forms use Zod schemas for validation:
- Required field validation
- Email format validation
- Field length limits
- Custom business rules

## Testing Strategy

Tests cover:
- Component rendering and interactions
- API service functions
- Custom hooks
- Form validation
- Error handling scenarios
- User workflows

## UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Mode Support**: Automatic theme switching
- **Loading States**: Skeleton loaders and spinners
- **Error States**: User-friendly error messages
- **Success Feedback**: Toast notifications
- **Accessibility**: ARIA labels and keyboard navigation

## Performance Optimizations

- React Query caching and background refetching
- Component code splitting
- Image optimization
- Efficient re-rendering with proper dependencies
- Lazy loading of heavy components

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3001/api` |

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before committing

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |

## Deployment

The built application can be deployed to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Firebase Hosting
- GitHub Pages

Ensure the API URL is correctly configured for your production environment.