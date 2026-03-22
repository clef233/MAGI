@echo off
chcp 65001 >nul
echo 正在停止 MAGI 服务...

:: 通过窗口标题精确终止 MAGI 进程（start.bat 中用 start "MAGI-Backend" / "MAGI-Frontend" 启动）
taskkill /FI "WINDOWTITLE eq MAGI-Backend" /F 2>nul
taskkill /FI "WINDOWTITLE eq MAGI-Frontend" /F 2>nul

:: 备用：通过端口终止（仅在窗口标题方式失败时生效）
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F 2>nul
)

echo MAGI 服务已停止。
pause