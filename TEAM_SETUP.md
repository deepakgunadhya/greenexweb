# 🚨 Team Setup Guide - Database Error Fix

## Current Error Your Team is Seeing:
```
❌ Database initialization error: PrismaClientKnownRequestError: 
Invalid prisma.role.upsert() invocation
```

This means your team needs to set up PostgreSQL properly.

---

## ✅ **Quick Fix (2 Options):**

### Option 1: Automated Fix (Recommended)
```bash
git pull origin main
chmod +x verify-db.sh
./verify-db.sh
```

### Option 2: Manual Fix

#### Step 1: Setup PostgreSQL
```bash
# Install PostgreSQL (if not installed)
brew install postgresql@14                     # macOS
sudo apt install postgresql postgresql-contrib # Ubuntu

# Start PostgreSQL
brew services start postgresql@14              # macOS  
sudo systemctl start postgresql                # Linux
```

#### Step 2: Create Database
```bash
# Connect to PostgreSQL
sudo -u postgres psql    # Linux
psql postgres            # macOS

# Create database and user
CREATE DATABASE greenex_dev;
CREATE USER greenex_user WITH PASSWORD 'greenex_password';
GRANT ALL PRIVILEGES ON DATABASE greenex_dev TO greenex_user;
\q
```

#### Step 3: Update Environment
```bash
cd apps/api

# Copy environment template (if .env doesn't exist)
cp .env.example .env

# Edit .env file and ensure it has:
# DATABASE_URL="postgresql://greenex_user:greenex_password@localhost:5432/greenex_dev"
```

#### Step 4: Setup Database Tables
```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init
```

#### Step 5: Start Application
```bash
cd ../..
pnpm dev
```

---

## 🔍 **Verify Your Setup:**

After setup, you should see:
```
🚀 Greenex API Server with Database Integration running on port 3001
📊 Database: PostgreSQL with Prisma ORM  ← Should say PostgreSQL, not SQLite
🌐 CORS enabled for localhost:3000
📝 Login: admin@greenex.com / admin123
💾 Database features: CRUD operations, user authentication, RBAC
✅ Ready for production-grade testing!
✅ Database initialized successfully        ← Should see success, not error
```

---

## 🆘 **Still Having Issues?**

### Common Problems:

**1. PostgreSQL not installed:**
- Install PostgreSQL first (see Step 1 above)

**2. PostgreSQL not running:**
```bash
brew services start postgresql@14              # macOS
sudo systemctl start postgresql                # Linux
```

**3. Database doesn't exist:**
- Follow Step 2 above to create database

**4. Permission denied:**
```sql
\c greenex_dev
GRANT ALL ON SCHEMA public TO greenex_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO greenex_user;
```

**5. Still using SQLite:**
- Check your `apps/api/.env` file
- Make sure `DATABASE_URL` starts with `postgresql://`

---

## 📞 **Need Help?**

If you're still getting errors, share:
1. Your operating system (Windows/Mac/Linux)
2. The exact error message
3. Output of: `psql --version` and `node --version`