@echo off
echo Starting MAGI Backend...
cd /d d:\Projects\MAGI\backend
start cmd /k "D:\anaconda\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo Backend starting on http://localhost:8000
echo.
echo Starting MAGI Frontend...
cd /d d:\Projects\MAGI\frontend
start cmd /k "npm run dev"
echo Frontend starting on http://localhost:3000
echo.
echo Done! Check the new windows for server logs.
pause