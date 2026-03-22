@echo off
title MAGI Stop
echo Stopping MAGI services...

taskkill /FI "WINDOWTITLE eq MAGI-Backend" /F 2>nul
taskkill /FI "WINDOWTITLE eq MAGI-Frontend" /F 2>nul

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F 2>nul
)

echo Done.
pause
