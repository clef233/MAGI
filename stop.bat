@echo off
echo Stopping all Python and Node processes...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM node.exe 2>nul
echo Done.
pause