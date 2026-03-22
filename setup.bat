@echo off
echo ========================================
echo   MAGI Setup
echo ========================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.9+
    echo Download: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH"
    pause
    exit /b 1
)
echo [OK] Python found

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found

echo.
echo [1/2] Installing backend dependencies...
cd /d "%~dp0backend"
pip install -e . >nul 2>&1
if errorlevel 1 (
    echo [WARN] pip install -e . failed, trying direct install...
    pip install fastapi "uvicorn[standard]" pydantic pydantic-settings python-multipart aiosqlite "sqlalchemy[asyncio]" httpx openai anthropic
)
echo [OK] Backend dependencies installed

echo.
echo [2/2] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
echo [OK] Frontend dependencies installed

echo.
echo ========================================
echo   Setup complete!
echo ========================================
echo.
echo Next step: double-click start.bat
echo First time: open http://localhost:3000 and click Quick Setup
echo.
pause
