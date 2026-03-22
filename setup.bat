@echo off
chcp 65001 >nul
echo ========================================
echo   MAGI 安装向导
echo ========================================
echo.

:: 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.9+
    echo 下载地址: https://www.python.org/downloads/
    echo 安装时请勾选 "Add Python to PATH"
    pause
    exit /b 1
)
echo [OK] Python 已安装

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js 已安装

:: 安装后端依赖
echo.
echo [1/3] 安装后端依赖...
cd /d "%~dp0backend"
pip install -e . >nul 2>&1
if errorlevel 1 (
    echo [警告] pip install -e . 失败，尝试直接安装依赖...
    pip install fastapi uvicorn[standard] pydantic pydantic-settings python-multipart aiosqlite "sqlalchemy[asyncio]" httpx openai anthropic
)
echo [OK] 后端依赖已安装

:: 安装前端依赖
echo.
echo [2/3] 安装前端依赖...
cd /d "%~dp0frontend"
call npm install
echo [OK] 前端依赖已安装

:: 完成
echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 运行方法：双击 start.bat
echo 首次使用：打开浏览器访问 http://localhost:3000
echo           点击页面上的"快速配置"按钮
echo.
pause