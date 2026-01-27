#!/bin/bash

# =====================================================
# Neo Linear - Build Test Script
# =====================================================
# This script tests the build process locally before Docker

echo "🔍 Neo Linear Server Build Test"
echo "================================"

# Check if we're in the server directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from server directory"
    echo "   Usage: cd server && ./test-build.sh"
    exit 1
fi

echo ""
echo "📋 Step 1: Checking required environment variables..."
required_vars=("DATABASE_URL" "JWT_SECRET" "FRONTEND_URL" "PORT" "NODE_ENV")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    else
        echo "  ✅ $var is set"
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo ""
    echo "❌ Missing environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "💡 Set them in .env file or export them:"
    echo "   export DATABASE_URL=\"postgresql://neo_linear:neo_linear_password@localhost:5432/neo_linear\""
    echo "   export JWT_SECRET=\"test-secret-for-build\""
    echo "   export FRONTEND_URL=\"http://localhost:3000\""
    echo "   export PORT=3001"
    echo "   export NODE_ENV=production"
    exit 1
fi

echo ""
echo "📦 Step 2: Installing dependencies..."
npm ci --legacy-peer-deps
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "  ✅ Dependencies installed"

echo ""
echo "🔧 Step 3: Generating Prisma client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi
echo "  ✅ Prisma client generated"

echo ""
echo "🏗️  Step 4: Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    echo ""
    echo "🐛 Debug Information:"
    echo "   - Node version: $(node --version)"
    echo "   - npm version: $(npm --version)"
    echo "   - TypeScript version: $(npx tsc --version)"
    echo ""
    echo "💡 Common issues:"
    echo "   1. Type errors: Check tsconfig.json paths"
    echo "   2. Missing modules: Run npm install"
    echo "   3. Env validation: Check .env file"
    exit 1
fi
echo "  ✅ Build successful"

echo ""
echo "✅ All checks passed! Ready for Docker build"
echo ""
echo "🚀 To build Docker image:"
echo "   docker compose build server"
echo ""
echo "🐳 To run with Docker Compose:"
echo "   docker compose up -d"
