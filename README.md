# Greenex Digital Platform

A comprehensive digital transformation platform for environmental consulting companies, enabling full operational lifecycle management from client engagement to final report delivery.

## 🌟 Features

### 🔐 Complete User & Role Management
- **Database-integrated RBAC** - Role-based access control per SRS requirements
- **User Management** - Create, edit, view, and deactivate users with modal interfaces  
- **Role Management** - Dynamic role creation with granular permissions
- **Professional UI** - Modern modal dialogs, no alert boxes
- **Real-time Updates** - All changes persist immediately to database

### 📊 Business Operations
- **Organizations** - Manage clients, prospects, partners, and vendors
- **Projects** - Comprehensive project lifecycle management
- **Quotations** - Create and manage project quotes
- **Reports** - Generate and deliver client reports

### 🛡️ Security & Data
- **JWT Authentication** - Secure login with database verification
- **Password Security** - bcrypt hashing with salt rounds
- **Input Validation** - Comprehensive form and API validation
- **Audit Trail** - Track all user actions and changes
- **Data Protection** - Secure handling of sensitive information

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: PostgreSQL with comprehensive schema
- **Monorepo**: Turborepo with pnpm workspaces
- **Authentication**: JWT with bcrypt password hashing

### Project Structure
```
greenex/
├── apps/
│   ├── api/                 # Backend API server
│   │   ├── src/
│   │   │   ├── modules/     # Feature modules (users, roles, etc.)
│   │   │   ├── middleware/  # Auth, error handling
│   │   │   └── utils/       # Utilities and helpers
│   │   ├── prisma/          # Database schema and migrations
│   │   └── server-db.js     # Main database-integrated server
│   └── web/                 # React frontend application
│       ├── src/
│       │   ├── pages/       # Application pages
│       │   ├── components/  # Reusable components
│       │   ├── stores/      # State management
│       │   └── lib/         # API client and utilities
│       └── ...
├── packages/                # Shared configurations
│   ├── eslint-config/       # Shared ESLint config
│   ├── shared-types/        # TypeScript type definitions
│   └── tailwind-config/     # Shared Tailwind config
└── docs/                    # Project documentation
    ├── SRS.md               # Software Requirements Specification  
    └── CLAUDE.md            # Technical implementation guide
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **PostgreSQL 14+** (installed and running)
- **pnpm** (recommended) or npm
- **Git**

### Installation

1. **Install PostgreSQL**
   ```bash
   # macOS (using Homebrew)
   brew install postgresql@14
   brew services start postgresql@14
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # Windows: Download from https://www.postgresql.org/download/windows/
   ```

2. **Create Database**
   ```bash
   # Connect to PostgreSQL (adjust for your setup)
   sudo -u postgres psql
   # OR on macOS: psql postgres
   
   # Create database and user
   CREATE DATABASE greenex_dev;
   CREATE USER greenex_user WITH PASSWORD 'greenex_password';
   GRANT ALL PRIVILEGES ON DATABASE greenex_dev TO greenex_user;
   \q
   ```

3. **Clone the repository**
   ```bash
   git clone https://github.com/amolgundhya/greenex.git
   cd greenex
   ```

4. **Install dependencies**
   ```bash
   pnpm install
   ```

5. **Setup database**
   ```bash
   cd apps/api
   
   # Generate Prisma client
   npx prisma generate
   
   # Create and run migrations
   npx prisma migrate dev --name init
   ```

6. **Start development servers**
   ```bash
   # From root directory
   cd ../..
   pnpm dev
   ```
   
   This starts both:
   - **API Server**: http://localhost:3001
   - **Web App**: http://localhost:3000

### Default Login
- **Email**: admin@greenex.com  
- **Password**: admin123

### Database Access
- **Prisma Studio**: Run `cd apps/api && npx prisma studio` for database GUI

## 🎯 Key Functionality

### User Management
- ✅ **Create Users** - Add new users with role assignments
- ✅ **Edit Users** - Update user details and roles via modal interface
- ✅ **View Users** - Professional user details modal with all information
- ✅ **Deactivate Users** - Soft delete with admin account protection
- ✅ **Role Assignment** - Multiple role selection with real-time updates

### Role Management  
- ✅ **Create Roles** - Dynamic role creation with permission selection
- ✅ **Edit Roles** - Modify role names, descriptions, and permissions
- ✅ **Delete Roles** - Remove custom roles (system roles protected)
- ✅ **Granular Permissions** - SRS-compliant atomic permissions system
- ✅ **Default Roles** - Pre-configured system roles per requirements

### API Features
- ✅ **RESTful Design** - Standard HTTP methods and status codes
- ✅ **Database Integration** - All endpoints connect to real database
- ✅ **Error Handling** - Comprehensive error messages and validation
- ✅ **Security** - JWT authentication, input validation, SQL injection protection

## 📋 Development Commands

### Database Operations
```bash
# Generate Prisma client
pnpm db:generate
# OR: cd apps/api && npx prisma generate

# Run database migrations  
pnpm db:migrate
# OR: cd apps/api && npx prisma migrate dev

# Open Prisma Studio (database GUI)
pnpm db:studio
# OR: cd apps/api && npx prisma studio

# Reset database (development only)
pnpm db:reset
# OR: cd apps/api && npx prisma migrate reset
```

### 🔧 Troubleshooting

#### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql   # macOS
sudo systemctl status postgresql       # Linux

# Start PostgreSQL if not running
brew services start postgresql@14      # macOS
sudo systemctl start postgresql        # Linux

# Test connection
psql -U greenex_user -d greenex_dev -h localhost
```

#### Database Permission Issues
```sql
-- Grant additional permissions if needed
\c greenex_dev
GRANT ALL ON SCHEMA public TO greenex_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO greenex_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO greenex_user;
```

#### Prisma Issues
```bash
# Regenerate Prisma client
cd apps/api
rm -rf node_modules/.prisma
npx prisma generate

# Reset migrations (if schema is corrupted)
npx prisma migrate reset
npx prisma migrate dev --name init
```

#### Port Already in Use
```bash
# Kill processes on ports 3000 and 3001
npx kill-port 3000 3001
# OR
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

#### CORS Error: "(0 , cors_1.default) is not a function"
This error occurs when trying to run the wrong server file. **Solution:**

```bash
# ❌ DON'T run this (causes CORS error):
cd apps/api && npm run dev:ts

# ✅ DO run this instead (working server):
cd apps/api && npm run dev
# OR from root:
pnpm dev
```

**Explanation**: The project has two servers:
- `src/server-db.js` (JavaScript, working, with database integration)  
- `src/index.ts` (TypeScript, incomplete, causes CORS errors)

Always use the JavaScript version (`server-db.js`) for development.

### Development Workflow  
```bash
# Start all development servers
pnpm dev

# Start only backend API
pnpm dev --filter api

# Start only frontend web app
pnpm dev --filter web

# Build all packages
pnpm build

# Lint all code
pnpm lint

# Fix auto-fixable lint issues
pnpm lint:fix

# Type check all TypeScript
pnpm type-check
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate test coverage report
pnpm test:coverage
```

## 📖 Documentation

- **[Software Requirements Specification](docs/SRS.md)** - Complete business requirements
- **[Technical Guide (CLAUDE.md)](CLAUDE.md)** - Architecture, patterns, and implementation details
- **API Documentation** - Available at http://localhost:3001/api-docs when running

## 🛠️ SRS Compliance

This implementation follows the [Software Requirements Specification](docs/SRS.md) including:

- ✅ **Section 4.2**: Role-based Access Control (RBAC)
- ✅ **Section 5.15**: User Management System  
- ✅ **Section 8**: Database Schema Design
- ✅ **Atomic Permissions**: crm.view_leads, project.create, etc.
- ✅ **Default System Roles**: Super Admin, Operations Manager, etc.
- ✅ **Security Requirements**: Authentication, validation, audit trails

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🔗 Links

- **Repository**: https://github.com/amolgundhya/greenex
- **Documentation**: [docs/](docs/)
- **Issues**: https://github.com/amolgundhya/greenex/issues

---

**Built with** ❤️ **and** 🤖 [Claude Code](https://claude.ai/code)