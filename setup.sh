#!/bin/bash

# Greenex Application Setup Script
# This script helps set up the application with PostgreSQL database

set -e  # Exit on any error

echo "🚀 Setting up Greenex Application..."
echo "======================================"

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is required. Please install PostgreSQL 14+ first."
    echo "   macOS: brew install postgresql@14"
    echo "   Ubuntu: sudo apt install postgresql postgresql-contrib"
    echo "   Windows: https://www.postgresql.org/download/windows/"
    exit 1
fi

echo "✅ Prerequisites check passed!"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Database setup
echo "🗄️  Setting up database..."

# Check if database exists
DB_EXISTS=$(psql -U greenex_user -d greenex_dev -h localhost -c '\q' 2>/dev/null && echo "yes" || echo "no")

if [ "$DB_EXISTS" = "no" ]; then
    echo "📋 Database doesn't exist. Please create it manually:"
    echo ""
    echo "   1. Connect to PostgreSQL:"
    echo "      sudo -u postgres psql    # Linux"
    echo "      psql postgres            # macOS"
    echo ""
    echo "   2. Create database and user:"
    echo "      CREATE DATABASE greenex_dev;"
    echo "      CREATE USER greenex_user WITH PASSWORD 'greenex_password';"
    echo "      GRANT ALL PRIVILEGES ON DATABASE greenex_dev TO greenex_user;"
    echo "      \\q"
    echo ""
    echo "   3. Re-run this script: ./setup.sh"
    exit 1
fi

# Setup Prisma
echo "🔧 Setting up Prisma..."
cd apps/api
npx prisma generate

# Check if migrations exist
if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations)" ]; then
    echo "🏗️  Creating initial migration..."
    npx prisma migrate dev --name init
else
    echo "🏗️  Running existing migrations..."
    npx prisma migrate deploy
fi

cd ../..

echo ""
echo "🎉 Setup completed successfully!"
echo "================================"
echo ""
echo "🚀 To start the application:"
echo "   pnpm dev                    # Starts both frontend and backend"
echo "   # OR separately:"
echo "   cd apps/api && npm run dev  # Backend only (JavaScript)"
echo "   cd apps/web && npm run dev  # Frontend only"
echo ""
echo "📱 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:3001"
echo "   Database: cd apps/api && npx prisma studio"
echo ""
echo "🔐 Default login:"
echo "   Email:    admin@greenex.com"
echo "   Password: admin123"
echo ""
echo "⚠️  Note: Use the JavaScript server (server-db.js) for database integration"
echo "📚 For help, see README.md"