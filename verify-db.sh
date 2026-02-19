#!/bin/bash

# Database Setup Verification Script for Team
echo "🔍 Greenex Database Setup Verification"
echo "======================================"

cd apps/api

# Check 1: Environment file
echo "📋 Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "   Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env file created - please update with your PostgreSQL credentials"
fi

# Check current DATABASE_URL
if grep -q "sqlite\|file:" .env; then
    echo "⚠️  SQLite detected in .env file!"
    echo "   You need to update .env with PostgreSQL connection:"
    echo "   DATABASE_URL=\"postgresql://greenex_user:greenex_password@localhost:5432/greenex_dev\""
    echo ""
    echo "❌ Please update your .env file and run this script again"
    exit 1
fi

echo "✅ PostgreSQL configuration detected in .env"

# Check 2: PostgreSQL connection
echo ""
echo "🗄️  Testing PostgreSQL connection..."
DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2 | tr -d '"')

# Extract connection details from DATABASE_URL
if [[ $DB_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
    
    echo "   Database: $DB_NAME"
    echo "   Host: $DB_HOST:$DB_PORT"
    echo "   User: $DB_USER"
    
    # Test connection
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ PostgreSQL connection successful!"
    else
        echo "❌ Cannot connect to PostgreSQL!"
        echo ""
        echo "🔧 To fix this:"
        echo "   1. Make sure PostgreSQL is running:"
        echo "      brew services start postgresql@14      # macOS"
        echo "      sudo systemctl start postgresql        # Linux"
        echo ""
        echo "   2. Create database and user:"
        echo "      sudo -u postgres psql                  # Linux"
        echo "      psql postgres                          # macOS"
        echo ""
        echo "      CREATE DATABASE $DB_NAME;"
        echo "      CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
        echo "      GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
        echo "      \\q"
        echo ""
        exit 1
    fi
else
    echo "❌ Invalid DATABASE_URL format in .env file"
    exit 1
fi

# Check 3: Prisma setup
echo ""
echo "🔧 Checking Prisma setup..."

# Generate Prisma client
echo "   Generating Prisma client..."
npx prisma generate > /dev/null 2>&1

# Check if migrations directory exists
if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "   No migrations found. Creating initial migration..."
    npx prisma migrate dev --name init
    if [ $? -eq 0 ]; then
        echo "✅ Database migrations created and applied!"
    else
        echo "❌ Migration failed! Check the error above."
        exit 1
    fi
else
    echo "   Applying existing migrations..."
    npx prisma migrate deploy
    if [ $? -eq 0 ]; then
        echo "✅ Database migrations applied!"
    else
        echo "❌ Migration failed! Check the error above."
        exit 1
    fi
fi

cd ../..

echo ""
echo "🎉 Database setup verification completed!"
echo "======================================"
echo ""
echo "🚀 You can now start the application:"
echo "   pnpm dev"
echo ""
echo "📱 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:3001"
echo ""
echo "🔐 Default login:"
echo "   Email:    admin@greenex.com"
echo "   Password: admin123"