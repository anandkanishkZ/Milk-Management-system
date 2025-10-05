@echo off
REM Dudh Wala Backend Quick Setup Script for Windows

echo 🥛 Setting up Dudh Wala Backend...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Check if .env file exists
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️ Please edit .env file with your actual configuration values
) else (
    echo ✅ .env file already exists
)

REM Generate Prisma client
echo 🗄️ Generating Prisma client...
npm run db:generate

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file with your database and Firebase credentials
echo 2. Run 'npm run db:push' to create database tables
echo 3. Run 'npm run dev' to start the development server
echo.
echo 🚀 Your backend will be available at: http://localhost:3000
echo 📡 API endpoints will be at: http://localhost:3000/api/v1

pause