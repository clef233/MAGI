@echo off
chcp 65001 >nul
echo ========================================
echo   启动 MAGI
echo ========================================

:: 启动后端
echo [1/2] 启动后端 (http://localhost:8000)...
cd /d "%~dp0backend"
start "MAGI-Backend" cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: 等待后端就绪
timeout /t 3 /nobreak >nul

:: 启动前端
echo [2/2] 启动前端 (http://localhost:3000)...
cd /d "%~dp0frontend"
start "MAGI-Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   MAGI 已启动
echo   前端: http://localhost:3000
echo   后端: http://localhost:8000
echo ========================================
echo.
echo 关闭方法: 双击 stop.bat 或关闭弹出的窗口
echo.

:: 等3秒后自动打开浏览器
timeout /t 5 /nobreak >nul
start http://localhost:3000