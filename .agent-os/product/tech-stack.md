# Technical Stack

> Last Updated: 2025-09-03
> Version: 1.0.0

## Application Framework

- **Framework:** Node.js with Express.js
- **Version:** Node.js 22 LTS
- **Language:** TypeScript
- **Package Manager:** npm
- **Build Tool:** Vite (for frontend)

## Database

- **Primary Database:** PostgreSQL 17+
- **ORM:** Prisma
- **Database Hosting:** Digital Ocean Managed PostgreSQL
- **Backup Strategy:** Daily automated backups

## JavaScript

- **Framework:** React 18+
- **Language:** TypeScript (TSX)
- **State Management:** Zustand
- **Data Fetching:** React Query
- **Build Tool:** Vite

## Import Strategy

- **Module System:** ES6 Modules
- **Path Resolution:** TypeScript path mapping
- **Bundle Strategy:** Code splitting with dynamic imports
- **Tree Shaking:** Enabled via Vite

## CSS Framework

- **Framework:** TailwindCSS 4.0+
- **Configuration:** Custom design system for professional services
- **Responsive Strategy:** Mobile-first design
- **Theme Management:** CSS custom properties

## UI Component Library

- **Primary Library:** Shadcn/ui
- **Base Components:** Radix UI primitives
- **Design System:** Custom components built on Radix
- **Accessibility:** WCAG 2.1 AA compliant

## Fonts Provider

- **Provider:** Google Fonts (self-hosted)
- **Primary Font:** Inter (professional sans-serif)
- **Font Loading:** Optimized with font-display: swap
- **Fallbacks:** System font stack

## Icon Library

- **Library:** Lucide React
- **Icon Strategy:** Tree-shakeable imports
- **Custom Icons:** SVG components when needed
- **Size Variants:** 16px, 20px, 24px standard sizes

## Application Hosting

- **Platform:** Vercel
- **Environment:** Production on main branch
- **Staging:** Staging branch deployment
- **Edge Network:** Vercel Edge Network for global performance

## Database Hosting

- **Provider:** Digital Ocean Managed PostgreSQL
- **Version:** PostgreSQL 17+
- **Connection Pooling:** PgBouncer
- **Monitoring:** Built-in Digital Ocean monitoring

## Asset Hosting

- **Storage:** Cloudflare R2
- **CDN:** Cloudflare CDN
- **Image Optimization:** Cloudflare Image Resizing
- **Cache Strategy:** Long-term caching with cache busting

## Deployment Solution

- **CI/CD:** GitHub Actions
- **Deployment Trigger:** Push to main/staging branches
- **Build Process:** Automated testing → Build → Deploy
- **Environment Variables:** Secure environment management

## Code Repository URL

- **Platform:** GitHub
- **Repository:** Private repository for proprietary resource planning tool
- **Branch Strategy:** main (production) / staging (testing) / feature branches
- **Code Quality:** ESLint + Prettier + TypeScript strict mode

## Architecture Notes

- **Pattern:** Monolithic architecture for MVP simplicity
- **API Design:** RESTful API with TypeScript validation
- **Authentication:** JWT-based authentication
- **Testing:** Jest for unit tests, Playwright for E2E tests
- **Error Handling:** Centralized error handling with logging
- **Performance:** Optimized for professional services team workflows (10-500 employees)