@echo off
title PropIQ — Starting servers...

echo.
echo  ====================================================
echo   PropIQ — Real Estate Intelligence. Unbiased.
echo  ====================================================
echo.

:: Check if npm packages are installed
if not exist "frontend\node_modules" (
    echo [1/2] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo.
)

:: Start FastAPI backend in new window
echo [2/2] Starting FastAPI backend on http://localhost:8000 ...
start "PropIQ Backend" cmd /k "call venv\Scripts\activate.bat && python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000"

:: Wait a moment for the backend to start
timeout /t 3 /nobreak > nul

:: Start Vite frontend in new window
echo [3/3] Starting React frontend on http://localhost:5173 ...
start "PropIQ Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo  ====================================================
echo   Both servers are starting in separate windows.
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo  ====================================================
echo.
echo  Press any key to close this window...
pause > nul
