@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"

echo Checking Node.js installation...
node -v || (
    echo "ERROR: Node.js was not found in C:\Program Files\nodejs"
    pause
    exit /b 1
)

echo.
echo Installing backend dependencies...
cd "%~dp0backend"
call npm install

echo Seeding database...
node seed.js

echo.
echo Checking for frontend build...
if not exist "%~dp0frontend\build" (
    echo Frontend build missing. Building now - this might take a moment...
    cd "%~dp0frontend"
    call npm install --legacy-peer-deps
    call npm run build
    cd "%~dp0backend"
)

echo.
echo ========================================================
echo Starting Unified Application...
echo Access it at: http://localhost:5000
echo ========================================================
echo.
node server.js
pause
