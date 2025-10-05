#!/bin/bash

# Dudh Wala Backend Quick Setup Script

echo "🥛 Setting up Dudh Wala Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️ PostgreSQL not found. Please ensure PostgreSQL is installed and running."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️ Please edit .env file with your actual configuration values"
else
    echo "✅ .env file already exists"
fi

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npm run db:generate

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database and Firebase credentials"
echo "2. Run 'npm run db:push' to create database tables"
echo "3. Run 'npm run dev' to start the development server"
echo ""
echo "🚀 Your backend will be available at: http://localhost:3000"
echo "📡 API endpoints will be at: http://localhost:3000/api/v1"