# Tech Stack

## Context

Global tech stack defaults for Agent OS projects, overridable in project-specific `.agent-os/product/tech-stack.md`.

### Backend
- Language: TypeScript (preferred) / JavaScript (ES2022+) / Python 3.11+
- Framework: Node.js (Express.js or Fastify) / Python (FastAPI or Flask)
- Package Manager: npm / pnpm / pip
- Node Version: 22 LTS (if using Node.js)
- ORM: Prisma (for TypeScript/Node.js) / SQLAlchemy (for Python)
- Testing: Jest (for TypeScript/Node.js) / Pytest (for Python)

### Frontend
- JavaScript Framework: React (with Vite)
- Language: TypeScript (TSX)
- State Management: Zustand / Redux Toolkit
- Data Fetching: React Query / SWR
- Build Tool: Vite
- Package Manager: npm / pnpm
- CSS Framework: TailwindCSS 4.0+
- UI Components: Shadcn/ui / Radix UI / Material UI
- Icons: Lucide React

### Database
- Primary Database: PostgreSQL 17+
- Database Hosting: Digital Ocean Managed PostgreSQL / Supabase / Neon
- Database Backups: Daily automated

### Infrastructure & Deployment
- Application Hosting: Vercel (for Next.js/React) / Digital Ocean App Platform / Fly.io
- Asset Storage: Amazon S3 / Cloudflare R2
- CDN: Cloudflare / Vercel Edge Network
- CI/CD Platform: GitHub Actions
- Deployment Trigger: Push to main/staging branches
- Production Environment: main branch
- Staging Environment: staging branch
- Monorepo Tooling: (Optional) Turborepo / Nx

### General
- Code Repository: GitHub
- Font Provider: Google Fonts (self-hosted)