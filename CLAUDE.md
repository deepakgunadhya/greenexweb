# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Greenex Digital Transformation Platform

## Project Overview

Greenex is a comprehensive digital platform for an environmental consulting company. The system digitizes the full operational lifecycle — from client engagement to final report delivery — while enabling seamless internal task coordination, document management, reporting automation, and EcoVadis compliance support.

**Current Status**: Documentation and planning phase - no code implementation exists yet.

### Two Core Systems
1. **Business Process Web App** - Internal operations, CRM, projects, checklists, reports, payments
2. **Client Portal** - Draft review, document uploads, status tracking, invoice downloads  
3. **Mobile App Backend APIs** - Content delivery, enquiries, project status (UI out of scope)

---

## 🏗️ Development Commands

### Project Setup (Future Implementation)
```bash
# Initialize monorepo with Turborepo
pnpm create turbo@latest greenex
cd greenex

# Install dependencies
pnpm install

# Setup environment files
cp .env.example .env.local

# Initialize database
pnpm db:migrate
pnpm db:seed
```

### Development Workflow
```bash
# Start development servers
pnpm dev                    # Start all apps (API + Web)
pnpm dev --filter api       # Start only backend
pnpm dev --filter web       # Start only frontend

# Database operations
pnpm db:migrate             # Run Prisma migrations
pnpm db:seed                # Seed with initial data
pnpm db:studio              # Open Prisma Studio GUI
pnpm db:reset               # Reset database (dev only)

# Code quality
pnpm lint                   # Lint all packages
pnpm lint:fix              # Fix auto-fixable lint issues
pnpm type-check            # TypeScript compilation check
pnpm format                # Prettier formatting

# Testing
pnpm test                   # Run unit tests
pnpm test:watch            # Run tests in watch mode
pnpm test:e2e              # Run end-to-end tests
pnpm test:coverage         # Generate test coverage report

# Build & deployment
pnpm build                  # Build all packages
pnpm build --filter api     # Build specific package
pnpm preview               # Preview production build locally
```

### Module-Specific Development
```bash
# Create new Express module
cd apps/api
mkdir -p src/modules/[module-name]
touch src/modules/[module-name]/controller.js
touch src/modules/[module-name]/service.js
touch src/modules/[module-name]/routes.js

# Generate Prisma client after schema changes
pnpm db:generate

# Create new React feature
cd apps/web
mkdir src/features/[feature-name]
```

---

## 🏛️ Architecture Overview

### Monorepo Structure (Planned)
```
greenex/
├── apps/
│   ├── api/                    # Express Backend (Port 3001)
│   │   ├── src/modules/        # Business domain modules
│   │   ├── src/middleware/     # Custom middleware
│   │   ├── src/utils/          # Utility functions
│   │   ├── prisma/             # Database schema & migrations
│   │   └── uploads/            # File storage (development)
│   └── web/                    # React Frontend (Port 3000)
│       ├── src/features/       # Feature-based organization
│       ├── src/components/ui/  # shadcn/ui components
│       └── src/lib/           # Utility libraries
├── packages/
│   ├── shared-types/           # Shared TypeScript definitions
│   ├── eslint-config/         # Shared ESLint configuration
│   └── tailwind-config/       # Shared Tailwind configuration
└── docs/                      # Project documentation
```

### Technology Stack

**Backend (Express)**
- **Framework**: Express.js 4+ with Node.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport.js
- **Validation**: Joi or Zod validation
- **API Docs**: Swagger with swagger-jsdoc and swagger-ui-express
- **File Upload**: Multer with local storage
- **Email**: Nodemailer with SMTP
- **Job Queue**: Bull with Redis
- **Testing**: Jest + Supertest
- **Logger**: Winston for structured logging
- **Security**: Helmet, CORS, rate limiting

**Frontend (React)**
- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **State**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod validation
- **UI**: shadcn/ui components + Radix primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Tables**: TanStack Table
- **Charts**: Recharts
- **Testing**: Vitest + Testing Library

**DevOps & Tooling**
- **Monorepo**: Turborepo with pnpm workspaces
- **Linting**: ESLint + Prettier with shared configs
- **Git Hooks**: Husky + lint-staged
- **CI/CD**: GitHub Actions (planned)
- **Type Safety**: TypeScript strict mode across all packages

---

## 📋 Requirements Documentation

### SRS Document Location
The complete Software Requirements Specification is located at:
```
docs/SRS.md
```

### How to Use SRS + CLAUDE.md Together

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **SRS.md** | Business requirements, workflows, user stories, acceptance criteria | Understanding WHAT to build, business rules, validation logic |
| **CLAUDE.md** | Technical implementation, patterns, architecture, UI specs | Understanding HOW to build, code patterns, styling |

### SRS Section → Code Module Mapping

| SRS Section | Code Module(s) | Key Files |
|-------------|---------------|-----------|
| 5.1 CRM Module | `api/modules/leads`, `api/modules/organizations` | leads.service.js, organizations.service.js, leads.controller.js |
| 5.2 Quotation & Deal | `api/modules/quotations` | quotations.service.js, quotations.controller.js, quotations.routes.js |
| 5.3 Service & Project | `api/modules/services`, `api/modules/projects` | projects.service.js, projects.controller.js |
| 5.4 Dynamic Checklists | `api/modules/checklists` | checklist-templates.service.js, project-checklists.service.js |
| 5.5 Work Assignment | `api/modules/tasks` | project-tasks.service.js, tasks.controller.js |
| 5.6 Verification Gate | `api/modules/verification` | verification.service.js, verification.controller.js |
| 5.7 Execution | `api/modules/execution` | execution-files.service.js, execution.controller.js |
| 5.8 Draft Reports | `api/modules/reports` | reports.service.js, report-generator.service.js |
| 5.9 Client Review | `api/modules/comments`, `web/features/client-portal` | project-comments.service.js, comments.controller.js |
| 5.10 Payments | `api/modules/payments` | payments.service.js, payments.controller.js |
| 5.11 Final Report & Invoice | `api/modules/invoices`, `api/modules/reports` | invoices.service.js, invoices.controller.js |
| 5.12 EcoVadis | `api/modules/ecovadis` | ecovadis.service.js, ecovadis-export.service.js |
| 5.13 CMS | `api/modules/cms` | posts.service.js, categories.service.js, cms.controller.js |
| 5.14 Notifications | `api/modules/notifications` | notifications.service.js, email.service.js |
| 5.15 User Management | `api/modules/users`, `api/modules/roles` | users.service.js, roles.service.js, users.controller.js |
| 5.16 Mobile App | `api/modules/mobile` | mobile-content.controller.js, mobile-projects.controller.js |
| 5.17.1 Meetings | `api/modules/meetings` | meetings.service.js, google-calendar.service.js |
| 5.17.2 Personal Tasks | `api/modules/personal-tasks` | personal-tasks.service.js, personal-tasks.controller.js |
| 5.17.3 Calculation Engine | `api/modules/calculations` | calculation-engine.service.js, calculations.controller.js |
| 5.17.4 Chat | `api/modules/chat` | conversations.service.js, messages.service.js, chat.controller.js |
| Section 4 RBAC | `api/modules/auth`, `api/middleware` | auth.middleware.js, permissions.middleware.js, auth.controller.js |
| Section 7 API Spec | All controllers | *.controller.js (with Swagger comments) |
| Section 8 Data Model | `api/prisma/schema.prisma` | schema.prisma |

### Quick Reference Commands

```bash
# Find SRS requirements for a module
grep -n "5.4" docs/SRS.md           # Checklist requirements

# Search for specific business rule
grep -n "verification" docs/SRS.md  # All verification-related requirements

# Find status definitions
grep -n "Status" docs/SRS.md        # All status enums/values
```

### Before Implementing Any Feature

1. **Read the relevant SRS section** - Understand business requirements
2. **Check CLAUDE.md** - Follow technical patterns
3. **Review related modules** - Maintain consistency
4. **Use Redux for state management** - All new frontend functionality MUST use Redux
5. **Define permissions** - Create backend permissions and frontend permission mappings
6. **Implement RBAC** - Add ProtectedRoute, PermissionGate, and sidebar permissions
7. **Validate against acceptance criteria** - SRS defines what "done" looks like

---

## 🎨 Design System & Brand Guidelines

### Color Palette (Based on Greenex Logo)

```typescript
// Tailwind config extension
export const greenexColors = {
  primary: {
    50: '#f0fdf4',   // Light green tints
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // Primary brand green
    600: '#16a34a',  // Primary dark (buttons, links)
    700: '#15803d',  // Hover states
    800: '#166534',  // Text on light backgrounds  
    900: '#14532d',  // Darkest (headings)
  },
  
  // Environmental secondary colors
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
  },
}

// Semantic color mapping
export const statusColors = {
  // Project statuses
  planned: 'bg-slate-100 text-slate-700',
  checklist_finalized: 'bg-blue-100 text-blue-700',
  verification_passed: 'bg-emerald-100 text-emerald-700',
  execution_in_progress: 'bg-amber-100 text-amber-700',
  draft_prepared: 'bg-purple-100 text-purple-700',
  client_review: 'bg-cyan-100 text-cyan-700',
  completed: 'bg-primary-100 text-primary-700',
  
  // Task statuses  
  to_do: 'bg-slate-100 text-slate-600',
  doing: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
  
  // Payment statuses
  pending: 'bg-amber-100 text-amber-700',
  partial: 'bg-orange-100 text-orange-700', 
  paid: 'bg-green-100 text-green-700',
} as const;
```

### Typography Scale

```typescript
// Font configuration
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    heading: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
  },
  
  // Usage guidelines
  pageTitle: 'text-3xl font-heading font-semibold text-slate-900',
  sectionHeading: 'text-xl font-heading font-semibold text-slate-800', 
  cardTitle: 'text-lg font-medium text-slate-800',
  bodyText: 'text-base text-slate-600',
  secondaryText: 'text-sm text-slate-500',
  label: 'text-sm font-medium text-slate-700',
  helperText: 'text-xs text-slate-400',
} as const;
```

### Component Design Patterns

**Layout Structure**
```tsx
// Main application layout
<div className="min-h-screen bg-slate-50">
  <Sidebar />
  <main className="ml-64">  {/* 256px sidebar width */}
    <Header />
    <div className="p-6">
      <PageHeader title="Page Title" />
      <PageContent />
    </div>
  </main>
</div>
```

**Data Table Pattern**
```tsx
// Consistent table styling
const tableConfig = {
  header: 'bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider',
  row: 'hover:bg-slate-50 border-b border-slate-100',
  cell: 'py-4 px-4 text-sm text-slate-600',
  actionColumn: 'text-right',
} as const;
```

**Standard Action Button Pattern**
```tsx
// CRITICAL: Use this exact pattern for ALL action buttons across the application
<div className="flex items-center space-x-2">
  {/* View Button */}
  <button 
    onClick={() => handleView(item)}
    className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
    title="View Details"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  </button>
  
  {/* Edit Button */}
  <button 
    onClick={() => handleEdit(item)}
    className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
    title="Edit"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  </button>
  
  {/* Delete/Deactivate Button */}
  <button 
    onClick={() => handleDelete(item)}
    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
    title="Delete"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  </button>
</div>

// Alternative: For card layouts (like roles), use justify-end
<div className="flex justify-end items-center space-x-2 mt-4 pt-4 border-t border-slate-100">
  // Same buttons as above
</div>
```

**Action Button Guidelines:**
- **ALWAYS use icons instead of text** for View/Edit/Delete actions
- **Use consistent colors**: Primary for view, slate for edit, red for delete  
- **Include hover effects** with background color changes
- **Add tooltips** with meaningful `title` attributes
- **Use proper spacing** with `space-x-2` between buttons
- **Standard padding** of `p-2` for all action buttons
- **Consistent icon size** of `w-4 h-4` for all SVG icons

---

## 🏗️ Implementation Patterns

### Express Module Structure
```
modules/[module-name]/
├── validators/
│   ├── create-[entity].validator.js
│   ├── update-[entity].validator.js
│   └── query-[entity].validator.js
├── models/
│   └── [entity].model.js        // Prisma model extensions
├── [module].controller.js
├── [module].service.js 
├── [module].routes.js
└── [module].repository.js        // For complex queries
```

### API Response Standardization
```javascript
// Standard response wrapper utility
const createResponse = (success, data = null, error = null, meta = null) => ({
  success,
  ...(data && { data }),
  ...(error && { error }),
  ...(meta && { meta })
});

// Success response helper
const successResponse = (data, meta = null) => 
  createResponse(true, data, null, meta);

// Error response helper  
const errorResponse = (code, message, details = null) => 
  createResponse(false, null, { code, message, details });

// Pagination meta helper
const createPaginationMeta = (page, pageSize, total) => ({
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize)
});

module.exports = {
  createResponse,
  successResponse,
  errorResponse,
  createPaginationMeta
};
```

### Frontend Feature Structure
```
features/[feature-name]/
├── components/
│   ├── [Feature]List.tsx
│   ├── [Feature]Form.tsx
│   └── [Feature]Detail.tsx
├── hooks/
│   └── use-[feature].ts
├── services/
│   └── [feature].service.ts
├── types.ts
└── index.ts
```

### Authentication Patterns

**Express Middleware**
```javascript
// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json(
      errorResponse('UNAUTHORIZED', 'Access token required')
    );
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json(
        errorResponse('FORBIDDEN', 'Invalid or expired token')
      );
    }
    req.user = user;
    next();
  });
};

// Permission-based authorization
const requirePermissions = (permissions) => {
  return (req, res, next) => {
    const userPermissions = req.user?.permissions || [];
    
    const hasAllPermissions = permissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return res.status(403).json(
        errorResponse('FORBIDDEN', 'Insufficient permissions')
      );
    }
    
    next();
  };
};

module.exports = { authenticateToken, requirePermissions };
```

**Frontend Route Protection**
```typescript
const useAuthGuard = (requiredPermissions: string[]) => {
  const { user, hasPermission } = useAuthStore();
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!requiredPermissions.every(p => hasPermission(p))) {
      throw new Error('Insufficient permissions');
    }
  }, [user, requiredPermissions]);
};
```

---

## 🔐 Business Rules Implementation

### Project Status State Machine
```javascript
const { errorResponse } = require('../utils/response');

class ProjectStatusValidator {
  static allowedTransitions = {
    planned: ['checklist_finalized'],
    checklist_finalized: ['verification_passed', 'planned'],
    verification_passed: ['execution_in_progress'],
    execution_in_progress: ['execution_complete', 'verification_passed'],
    execution_complete: ['draft_prepared'],
    draft_prepared: ['client_review'], 
    client_review: ['draft_prepared', 'account_closure'],
    account_closure: ['completed'],
    completed: [],
  };
  
  static canTransition(from, to) {
    return this.allowedTransitions[from]?.includes(to) ?? false;
  }
  
  static validateTransition(project, newStatus) {
    if (!this.canTransition(project.status, newStatus)) {
      throw new Error(`Cannot transition from ${project.status} to ${newStatus}`);
    }
    
    // Additional preconditions based on business rules
    switch (newStatus) {
      case 'checklist_finalized':
        if (project.checklists.some(c => c.status !== 'finalized')) {
          throw new Error('All checklists must be finalized');
        }
        break;
        
      case 'verification_passed':
        if (project.verificationStatus !== 'passed') {
          throw new Error('Verification must pass first');
        }
        break;
        
      case 'execution_complete':
        if (project.tasks.some(t => t.status !== 'done')) {
          throw new Error('All tasks must be completed');
        }
        break;
    }
  }
}

module.exports = ProjectStatusValidator;
```

### Checklist Completeness Calculation
```javascript
class ChecklistValidator {
  static calculateCompleteness(checklist) {
    const mandatoryItems = checklist.items.filter(i => i.mandatory);
    const completedMandatory = mandatoryItems.filter(item => {
      if (item.type === 'file' || item.type === 'multi_file') {
        return item.files && item.files.length > 0;
      }
      return item.value !== null && item.value !== '';
    });
    
    return Math.round((completedMandatory.length / mandatoryItems.length) * 100);
  }
  
  static canSubmitForVerification(checklist) {
    return (
      checklist.status === 'in_progress' && 
      this.calculateCompleteness(checklist) === 100
    );
  }
}

module.exports = ChecklistValidator;
```

---

## 📄 File Organization Guidelines

### Import/Export Conventions
```typescript
// Use index.ts files for clean imports
// features/projects/index.ts
export { ProjectList } from './components/ProjectList';
export { ProjectForm } from './components/ProjectForm';
export { useProjects, useProject } from './hooks/use-projects';
export * from './types';

// Import in consuming files
import { ProjectList, useProjects } from '@/features/projects';
```

### Type Definition Strategy
```typescript
// Shared types in packages/shared-types
export interface Project {
  id: number;
  name: string;
  status: ProjectStatus;
  // ... other fields
}

// Feature-specific types
export interface ProjectListFilters {
  status?: ProjectStatus;
  organizationId?: number;
  search?: string;
}

// API response types
export interface ProjectResponse extends ApiResponse<Project> {}
export interface ProjectListResponse extends ApiResponse<Project[]> {}
```

---

## 🧪 Testing Strategy

### Unit Testing Patterns
```javascript
// Service testing with mocked dependencies
const ProjectsService = require('../../modules/projects/projects.service');
const { PrismaClient } = require('@prisma/client');

// Mock Prisma
jest.mock('@prisma/client');

describe('ProjectsService', () => {
  let service;
  let mockPrisma;
  
  beforeEach(() => {
    mockPrisma = {
      project: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    
    service = new ProjectsService(mockPrisma);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('create', () => {
    it('should create project from accepted quotation', async () => {
      // Arrange
      const quotationData = { id: 1, status: 'accepted' };
      const projectData = { name: 'Test Project', quotationId: 1 };
      
      mockPrisma.project.create.mockResolvedValue({ id: 1, ...projectData });
      
      // Act
      const result = await service.create(projectData);
      
      // Assert
      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: projectData
      });
      expect(result).toEqual({ id: 1, ...projectData });
    });
    
    it('should reject if quotation not accepted', async () => {
      // Test implementation  
      const projectData = { quotationId: 1 };
      
      await expect(service.create(projectData))
        .rejects
        .toThrow('Quotation must be accepted before creating project');
    });
  });
});
```

### Component Testing
```typescript
// React component testing
describe('ProjectForm', () => {
  it('should submit valid project data', async () => {
    render(<ProjectForm onSubmit={mockSubmit} />);
    
    await user.type(screen.getByLabelText(/project name/i), 'Test Project');
    await user.click(screen.getByRole('button', { name: /create/i }));
    
    expect(mockSubmit).toHaveBeenCalledWith({
      name: 'Test Project',
      // ... other expected data
    });
  });
  
  it('should show validation errors for required fields', async () => {
    render(<ProjectForm onSubmit={mockSubmit} />);
    
    await user.click(screen.getByRole('button', { name: /create/i }));
    
    expect(screen.getByText(/project name is required/i)).toBeInTheDocument();
  });
});
```

---

## 🚀 Environment Configuration

### Development Environment Setup
```bash
# .env.local (for local development)
DATABASE_URL="postgresql://user:password@localhost:5432/greenex_dev"
JWT_SECRET="development-secret-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Application
NODE_ENV="development"
API_PORT=3001
WEB_PORT=3000
FRONTEND_URL="http://localhost:3000"

# File upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=20971520  # 20MB

# Email configuration (development)
SMTP_HOST="smtp.ethereal.email"  # Use Ethereal for dev testing
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Greenex Dev <dev@greenex.local>"

# Redis (for job queues)
REDIS_HOST="localhost" 
REDIS_PORT=6379

# External integrations (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### Production Considerations
```bash
# Production environment variables
DATABASE_URL="postgresql://user:password@prod-db:5432/greenex_prod"
JWT_SECRET="super-secure-production-secret-min-32-characters"
NODE_ENV="production"
API_URL="https://api.greenex.com"
WEB_URL="https://app.greenex.com"

# File storage (production should use cloud storage)
AWS_S3_BUCKET="greenex-documents"
AWS_REGION="us-west-2"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""

# Email (production SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="noreply@greenex.com"
SMTP_PASS="app-specific-password"
```

---

## 📊 Performance & Optimization

### Database Query Optimization
```javascript
// Use proper Prisma includes/selects
const getProjects = async (filters, page, pageSize) => {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      organization: {
        select: { id: true, name: true }
      },
      _count: {
        select: { tasks: true, checklists: true }
      }
    },
    where: filters,
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    skip: (page - 1) * pageSize,
  });
  
  return projects;
};

// Get total count for pagination
const getProjectsCount = async (filters) => {
  return await prisma.project.count({ where: filters });
};

// Index important query fields in schema.prisma:
// @@index([status, organizationId])
// @@index([createdAt])
```
```

### Frontend Performance
```typescript
// React Query configuration
export const queryConfig = {
  queries: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes  
    retry: 3,
    refetchOnWindowFocus: false,
  },
};

// Component optimization
export const ProjectList = memo(({ projects }: ProjectListProps) => {
  const memoizedProjects = useMemo(() => 
    projects.map(project => ({
      ...project,
      statusBadge: getStatusBadge(project.status),
    }))
  , [projects]);
  
  return (
    <Table>
      {memoizedProjects.map(project => (
        <ProjectRow key={project.id} project={project} />
      ))}
    </Table>
  );
});
```

---

## 🔧 Development Guidelines

### Code Quality Standards
- **TypeScript strict mode** - No `any` types allowed
- **Exhaustive switch statements** - Handle all enum cases
- **Error boundaries** - Wrap all feature routes
- **Loading states** - Always show loading UI during async operations
- **Error handling** - Graceful error display with retry options
- **Accessibility** - WCAG 2.1 AA compliance for all UI components

### Git Workflow
```bash
# Conventional commit format
feat(projects): add project status transition validation
fix(auth): resolve token refresh race condition  
docs(api): update swagger documentation for user endpoints
style(ui): update button hover states
refactor(services): extract common validation logic
test(projects): add unit tests for project service
chore(deps): update dependencies to latest versions
```

### API Design Principles
- **RESTful conventions** - Use standard HTTP methods and status codes
- **Consistent naming** - camelCase for JSON, kebab-case for URLs
- **Pagination** - Always paginate list endpoints
- **Filtering** - Support query parameters for filtering/searching
- **Versioning** - API version in URL path (`/api/v1/`)
- **Documentation** - Auto-generated Swagger docs for all endpoints

---

## Notes for AI Assistants

When working on this project:

1. **Read docs/SRS.md first** for business requirements before implementing any feature
2. **Check this file (CLAUDE.md)** for technical patterns and conventions  
3. **Map SRS sections to code** using the reference table above
4. **Follow established patterns** - consistency is key for maintainability
5. **USE REDUX FOR ALL STATE MANAGEMENT** - Never use local React state for data that should be shared or persisted
6. **IMPLEMENT COMPLETE RBAC** - Every new module needs permissions, ProtectedRoute, PermissionGate, and sidebar integration
7. **Use the defined color palette** - don't introduce new colors
8. **Validate against SRS** for business logic requirements
9. **Include accessibility** - proper labels, keyboard navigation, focus states
10. **Write type-safe code** - leverage TypeScript's type system fully
11. **Handle edge cases** - loading, error, and empty states in UI components
12. **Use service layer** - don't call APIs directly from React components
13. **Follow module structure** - keep related code together
14. **Test critical paths** - authentication, project workflows, status transitions

### Redux State Management Requirements

**CRITICAL: All new frontend functionality MUST use Redux for state management.**

- **Create Redux slices** for each domain (following existing patterns in `store/slices/`)
- **Use createAsyncThunk** for all async operations (API calls)
- **Implement optimistic updates** where appropriate
- **Cache data properly** by entity ID for efficient lookups
- **Handle loading, error, and success states** in reducers
- **Use useAppSelector/useAppDispatch** instead of plain React state
- **Never directly call API functions** from components - always go through Redux actions

### Role-Based Access Control (RBAC) Requirements

**CRITICAL: All new functionality MUST implement proper permission-based access control.**

The role-based UI integration and route protection has been completed. **ALL future implementations MUST follow these requirements:**

#### 1. **Permissions for New Modules**
When adding ANY new module:
- **Backend**: Define permissions in the database schema and seed data
- **Frontend**: Add ALL role-based permissions to `utils/permissions.ts`
- **Format**: Use `modulename:action` pattern (e.g., `meetings:read`, `meetings:create`, `meetings:update`, `meetings:delete`)
- **Missing permissions will hide modules from UI** (example: Meeting module currently missing permissions)

```typescript
// Example: utils/permissions.ts
export const ROLE_PERMISSIONS = {
  admin: [
    // ... existing permissions
    'meetings:read',
    'meetings:create', 
    'meetings:update',
    'meetings:delete',
    'meetings:schedule',
    'meetings:complete',
  ],
  manager: [
    'meetings:read',
    'meetings:create',
    'meetings:schedule',
  ],
  // ... other roles
};
```

#### 2. **Protected Routes - MANDATORY**
**Every new route or component MUST be wrapped with ProtectedRoute:**

```typescript
// REQUIRED pattern for all new routes
<Route
  path="/new-module"
  element={
    <ProtectedRoute requiredPermissions={["newmodule:read"]}>
      <NewModulePage />
    </ProtectedRoute>
  }
/>

// REQUIRED pattern for nested routes  
<Route
  path="/new-module/create"
  element={
    <ProtectedRoute requiredPermissions={["newmodule:create"]}>
      <CreateNewModulePage />
    </ProtectedRoute>
  }
/>
```

#### 3. **Sidebar Permission Integration - MANDATORY**
**Every new module MUST have permission-aware sidebar entry:**

```typescript
// REQUIRED pattern in app-layout.tsx navigation array
{
  name: "New Module",
  href: "/new-module", 
  icon: "🔧",
  permissions: ["newmodule:read"], // CRITICAL: Must match exact permission
}
```

#### 4. **Component-Level Permissions - MANDATORY**
**Use PermissionGate component for granular access control:**

```typescript
// REQUIRED pattern for action buttons
<PermissionGate requiredPermissions={["newmodule:create"]}>
  <Button onClick={handleCreate}>
    <Plus className="w-4 h-4 mr-2" />
    Create New Item
  </Button>
</PermissionGate>

// REQUIRED pattern for edit/delete actions
<PermissionGate requiredPermissions={["newmodule:update"]}>
  <button onClick={() => handleEdit(item)} className="...">
    Edit
  </button>
</PermissionGate>

<PermissionGate requiredPermissions={["newmodule:delete"]}>
  <button onClick={() => handleDelete(item)} className="...">
    Delete  
  </button>
</PermissionGate>
```

#### 5. **Permission Validation Patterns**

```typescript
// REQUIRED: Check permissions before API calls
const { hasPermission } = useAuth();

const handleCreate = async () => {
  if (!hasPermission('newmodule:create')) {
    toast.error('Insufficient permissions');
    return;
  }
  // ... proceed with creation
};

// REQUIRED: Conditional rendering based on permissions
const canEdit = hasPermission('newmodule:update');
const canDelete = hasPermission('newmodule:delete');
```

#### 6. **Backend Permission Enforcement**
**All API endpoints MUST enforce permissions:**

```javascript
// REQUIRED pattern for all new routes
router.get('/new-module', 
  authenticateToken,
  requirePermissions(['newmodule:read']),
  controller.getAll
);

router.post('/new-module',
  authenticateToken, 
  requirePermissions(['newmodule:create']),
  validateNewModule,
  controller.create
);
```

#### **⚠️ CRITICAL REMINDERS:**
- **Missing permissions = Hidden from UI** (users won't see the module)
- **Every route needs ProtectedRoute wrapper**
- **Every sidebar item needs permissions array** 
- **Every action button needs PermissionGate**
- **Backend must enforce permissions on ALL endpoints**
- **Use exact permission strings consistently across frontend/backend**

### Quick SRS Reference for Development

| Implementation Task | SRS Section | Key Requirements |
|-------------------|-------------|------------------|
| Project status transitions | 5.3.3 | Must follow strict state machine, manual ops approval |
| Checklist validation | 5.4.2 | 100% mandatory completion before verification |
| Verification workflow | 5.6 | All checklists must pass, QA approval required |
| Client portal access | 5.9 | PDF-only view, comment system, approval workflow |
| Payment blocking | 5.10 | Configurable delivery block until payment received |
| File versioning | 5.4.4 | Doc_v1, Doc_v2 naming, audit trail preservation |
| Notification triggers | 5.14.1 | Role-based email notifications, no in-app alerts |
| RBAC implementation | 4.2 | Permission-based access, role inheritance |
| EcoVadis structure | 5.12.1 | Four pillars, pre-seeded templates |
| Mobile API design | 5.16.2 | Content delivery, project status, enquiry submission |

---

## 🔄 **MANDATORY Git Workflow to Prevent Missing Files**

**CRITICAL: This workflow is MANDATORY for all development to prevent missing files in commits.**

### **🚨 Problem Statement**
Missing files in commits cause:
- ❌ Broken builds and TypeScript compilation errors  
- ❌ Import errors and runtime failures
- ❌ Incomplete feature implementations
- ❌ Wasted time debugging and fixing
- ❌ Team productivity loss

### **✅ Solution: Multi-Layer Verification Process**

#### **Layer 1: Development-Time File Tracking**
**REQUIRED: Track files as you create them during development**

```bash
# Use TodoWrite to track files being created/modified for each feature
# Example:
todowrite add "File: apps/api/src/modules/quotations/quotations.controller.ts"
todowrite add "File: apps/api/src/modules/quotations/quotations.service.ts"  
todowrite add "File: apps/api/src/modules/quotations/quotations.routes.ts"
todowrite add "File: apps/web/src/store/slices/quotationsSlice.ts"
todowrite add "File: apps/web/src/lib/api/quotations.ts"
todowrite add "File: apps/web/src/pages/quotations.tsx"
```

#### **Layer 2: Pre-Commit Verification (MANDATORY)**
**REQUIRED: Run verification script before EVERY commit**

```bash
# Before any commit, ALWAYS run:
./verify-commit.sh [feature-name]

# Example for quotations feature:
./verify-commit.sh quotations

# Script will check:
# ✅ All untracked files are accounted for
# ✅ All imports resolve to existing files  
# ✅ TypeScript compilation passes
# ✅ No missing Redux slices or API clients
# ✅ All staged files are appropriate for the feature
```

#### **Layer 3: Systematic Commit Process (MANDATORY)**
**REQUIRED: Follow this exact process for every commit**

```bash
# Step 1: Review all changes
git status                          # See overview
git diff                           # Review unstaged changes  
git diff --cached                  # Review staged changes

# Step 2: Run pre-commit verification
./verify-commit.sh [feature-name]  # MANDATORY verification

# Step 3: Fix any issues found
git add .                          # Add missing files (if verification shows them)
git reset HEAD file.txt           # Unstage unwanted files

# Step 4: Re-run verification until clean
./verify-commit.sh [feature-name]  # Must pass before proceeding

# Step 5: Commit with comprehensive message
git commit -m "$(cat <<'EOF'
feat(module): implement [feature description]

- Specific change 1
- Specific change 2  
- Specific change 3

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Step 6: Final verification and push
git status                         # Should show clean working tree
git push origin $(git branch --show-current)
```

#### **Layer 4: Feature Completion Checklist (MANDATORY)**
**REQUIRED: Complete this checklist for every feature implementation**

##### **Backend Implementation Checklist:**
- [ ] **Controller**: `src/modules/[module]/[module].controller.ts`
- [ ] **Service**: `src/modules/[module]/[module].service.ts`  
- [ ] **Routes**: `src/modules/[module]/[module].routes.ts`
- [ ] **Validators**: `src/modules/[module]/[module].validator.ts` (if needed)
- [ ] **Tests**: `src/modules/[module]/__tests__/` (if applicable)
- [ ] **Route Integration**: Added to `src/routes/index.ts`
- [ ] **Database Schema**: Updated `prisma/schema.prisma` (if needed)
- [ ] **Migrations**: Run and tested `prisma migrate`
- [ ] **Permissions**: Added to seed data and backend middleware

##### **Frontend Implementation Checklist:**  
- [ ] **Redux Slice**: `src/store/slices/[module]Slice.ts`
- [ ] **Store Integration**: Added reducer to `src/store/index.ts`
- [ ] **API Client**: `src/lib/api/[module].ts`
- [ ] **Page Component**: `src/pages/[module].tsx`
- [ ] **Feature Components**: `src/components/[module]/` (if needed)
- [ ] **Route Protection**: Added `ProtectedRoute` wrapper
- [ ] **Permission Gates**: Added `PermissionGate` for actions
- [ ] **Sidebar Integration**: Added to navigation with permissions
- [ ] **Types**: Shared types defined and imported correctly
- [ ] **Error Handling**: Loading, error, and empty states implemented

##### **Integration Checklist:**
- [ ] **Permissions Mapping**: Added to `utils/permissions.ts`
- [ ] **RBAC Backend**: All endpoints have `requirePermissions()`
- [ ] **RBAC Frontend**: All actions wrapped with permission checks  
- [ ] **Import Verification**: All imports resolve correctly
- [ ] **Build Verification**: `npm run build` passes in both frontend/backend
- [ ] **Type Checking**: `npm run type-check` passes
- [ ] **No Console Errors**: Application runs without errors
- [ ] **End-to-End Testing**: Feature works completely from UI to database

#### **Layer 5: Git Aliases for Efficiency (RECOMMENDED)**
**Add these to your shell profile (.bashrc/.zshrc) for efficiency**

```bash
# Git workflow aliases
alias gst="git status"
alias gd="git diff"
alias gdc="git diff --cached"
alias gaa="git add ."
alias gcm="git commit -m"
alias gps="git push origin \$(git branch --show-current)"

# Greenex-specific aliases  
alias verify="./verify-commit.sh"
alias vcommit="./verify-commit.sh && echo 'Verification passed! Ready to commit.'"
alias fullcommit="./verify-commit.sh && git add . && git commit && git push"
```

#### **Layer 6: Common File Patterns to Watch For**

**ALWAYS check for these common missing files:**

| When You Modify... | Also Check For... |
|-------------------|-------------------|
| `store/index.ts` | Missing `store/slices/[feature]Slice.ts` |
| `routes/index.ts` | Missing controller/service/routes files |
| Page with Redux | Missing API client file |
| New API endpoints | Missing frontend service integration |  
| Database schema | Missing migration files |
| Component imports | Missing component definition files |
| New dependencies | Updated package.json files |

#### **🚨 Emergency Checklist: If Build is Broken**

If you encounter "module not found" or import errors:

1. **Immediate Fix:**
   ```bash
   git status                    # Check for untracked files
   find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep [missing-module]
   git add [missing-files]
   git commit -m "fix: add missing files for [module]"
   git push
   ```

2. **Root Cause Analysis:**
   ```bash
   ./verify-commit.sh           # Run verification
   grep -r "import.*[missing-module]" . --include="*.ts" --include="*.tsx"
   ```

3. **Prevention for Next Time:**
   - Always run `./verify-commit.sh` before committing
   - Use TodoWrite to track files during development
   - Follow the systematic commit process above

### **📝 Commit Message Template**

```
type(scope): brief description

- Detailed change 1 with file references
- Detailed change 2 with file references  
- Detailed change 3 with file references

Files modified:
- path/to/file1.ts (purpose)
- path/to/file2.tsx (purpose)
- path/to/file3.ts (purpose)


## Testing Standards
### Unit Tests
- Framework: Jest (React Native) / Vitest (web)
- Coverage target: 80%+ for new code
- Name pattern: `*.test.ts` or `*.spec.ts`
- Location: Co-located with source files
### E2E Tests
- Framework: Playwright
- Test directory: `tests/e2e/`
- Page Object Model: `tests/pages/`
- Always use semantic locators (data-testid, role, label)
- Always add proper waits — never use hardcoded timeouts

### Test Generation Rules
- Every new feature MUST include tests before PR
- Cover happy path + 2 error cases + 1 edge case minimum
- Test names: describe WHAT + WHEN + expected outcome
- Example: "should show error message when login fails with invalid password"

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### **⚠️ CRITICAL REMINDERS**
- **NEVER commit without running `./verify-commit.sh`**
- **NEVER ignore untracked files without reviewing them**  
- **NEVER commit if TypeScript compilation fails**
- **ALWAYS use TodoWrite to track files during development**
- **ALWAYS run `git status` before and after commits**
- **ALWAYS test the application after changes before committing**

This workflow prevents 99% of missing file issues when followed consistently.