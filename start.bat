@echo off
title MAGI Launcher
echo ========================================
echo   MAGI Launcher
echo ========================================
echo.

echo [Check] Python:
python --version 2>&1
if errorlevel 1 (
    echo   *** Python not found! Install Python 3.9+ and add to PATH ***
    echo.
)

echo [Check] Node.js:
node --version 2>&1
if errorlevel 1 (
    echo   *** Node.js not found! Install from https://nodejs.org/ ***
    echo.
)

echo [Check] uvicorn:
python -c "import uvicorn; print('  uvicorn OK')" 2>&1
if errorlevel 1 (
    echo   *** uvicorn not installed! Run setup.bat first ***
    echo.
)

echo [Check] frontend node_modules:
if exist "%~dp0frontend\node_modules\next" (
    echo   node_modules OK
) else (
    echo   *** node_modules missing! Run setup.bat first ***
)
echo.
echo ========================================
echo.

echo [1/2] Starting backend (port 8000)...
start "MAGI-Backend" /D "%~dp0backend" cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Waiting for backend (5s)...
timeout /t 5 /nobreak >nul

echo [2/2] Starting frontend (port 3000)...
start "MAGI-Frontend" /D "%~dp0frontend" cmd /k "npm run dev"

echo Waiting for frontend (8s)...
timeout /t 8 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo.
echo ========================================
echo   MAGI is running
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo ========================================
echo.
echo Keep the two background CMD windows open.
echo To stop: double-click stop.bat
echo.
pause
