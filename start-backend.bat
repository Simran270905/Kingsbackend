@echo off
echo ========================================
echo KKings Jewellery - Backend Startup
echo ========================================

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

:: Check if port 5000 is already in use
echo 🔍 Checking if port 5000 is available...
netstat -ano | findstr :5000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️ Port 5000 is already in use. Killing existing processes...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

:: Navigate to backend directory
cd /d "%~dp0"

:: Check if .env file exists
if not exist ".env" (
    echo ❌ .env file not found. Creating default .env file...
    copy .env.example .env >nul 2>&1
    if not exist ".env" (
        echo ❌ Please create .env file manually.
        pause
        exit /b 1
    )
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

:: Start the server
echo 🚀 Starting backend server...
echo 📍 Server will be available at: http://localhost:5000
echo 📝 API Documentation: http://localhost:5000/api
echo.
echo Press Ctrl+C to stop the server
echo ========================================

npm start

pause
