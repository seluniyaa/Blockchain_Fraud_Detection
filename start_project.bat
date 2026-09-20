@echo off
setlocal EnableDelayedExpansion
title Blockchain Fraud Detection Platform - Unified Launcher
color 0b

echo ===============================================================================
echo         BLOCKCHAIN CREDIT CARD FRAUD DETECTION & RESPONSE PLATFORM
echo                     Unified Dual-Service Launcher
echo ===============================================================================
echo.
echo  Working Directory: %~dp0
echo.

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "VENV_PYTHON=%BACKEND_DIR%\venv\Scripts\python.exe"

:: -----------------------------------------------------------------------------
:: Pre-Flight Verifications
:: -----------------------------------------------------------------------------
if not exist "%VENV_PYTHON%" (
    echo [ERROR] Python Virtual Environment was not found at:
    echo         "%VENV_PYTHON%"
    echo.
    echo Please run 'setup_and_migrate.bat' first to set up the environment and databases.
    echo.
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo [WARNING] Frontend node_modules directory was not found.
    echo           Please run 'setup_and_migrate.bat' to install dependencies if frontend fails.
    echo.
)

:: Detect npm.cmd to avoid PowerShell ExecutionPolicy restrictions (npm.ps1)
where npm.cmd >nul 2>&1
if %errorlevel% equ 0 (
    set "NPM_EXEC=npm.cmd"
) else (
    set "NPM_EXEC=npm"
)

:: Quick Port 8000 and 3000 Availability Check
netstat -ano 2>nul | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [NOTE] Port 8000 is currently in use. If an earlier backend instance is open,
    echo        it will serve existing requests.
)

netstat -ano 2>nul | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [NOTE] Port 3000 is currently in use. Vite will automatically attach or pick 3001.
)

echo.
:: -----------------------------------------------------------------------------
:: 1. Launch FastAPI Backend Daemon
:: -----------------------------------------------------------------------------
echo [1/2] Spawning Backend Server (FastAPI on http://127.0.0.1:8000)...
start "Blockchain Fraud Detection - Backend (FastAPI)" /D "%BACKEND_DIR%" cmd /k "venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

ping 127.0.0.1 -n 3 >nul

:: -----------------------------------------------------------------------------
:: 2. Launch React Vite Frontend Client
:: -----------------------------------------------------------------------------
echo [2/2] Spawning Frontend Client (Vite on http://localhost:3000)...
start "Blockchain Fraud Detection - Frontend (Vite)" /D "%FRONTEND_DIR%" cmd /k "%NPM_EXEC% run dev -- --port 3000"

ping 127.0.0.1 -n 3 >nul

:: -----------------------------------------------------------------------------
:: 3. Automatically Open Default Web Browser
:: -----------------------------------------------------------------------------
echo.
echo [INFO] Dispatching web browser to http://localhost:3000/...
start http://localhost:3000/

echo.
echo ===============================================================================
echo                   SERVICES INITIALIZATION DISPATCHED
echo ===============================================================================
echo.
echo  Access Points:
echo    * Frontend Web Application:   http://localhost:3000/
echo    * Backend REST API and Docs:  http://127.0.0.1:8000/docs
echo    * Backend Health Endpoint:    http://127.0.0.1:8000/api/health
echo.
echo  Default Login Credentials:
echo    * Customer (Standard):        alice    /  alice123    (Visa Signature)
echo    * Customer (Gold VIP):        marcus   /  marcus123   (Mastercard World Elite)
echo    * Customer (Ultra-VIP):       elena    /  elena123    (Amex Corporate Platinum)
echo    * Red-Team Adversary:         attacker /  attacker123 (Exploit Simulation Studio)
echo    * Bank SOC Manager:           manager  /  manager123  (Incident Forensics and Recovery)
echo.
echo  Automated Test Suites (Run in a separate terminal while server is running):
echo    cd backend ^&^& venv\Scripts\activate
echo    python test_e2e_platform.py             (Master End-to-End Suite)
echo    python test_dispute_recovery.py         (Dispute, Traceback and Asset Recovery)
echo    python test_autorepair_and_randomness.py (Consensus Tamper and Auto-Repair)
echo.
echo  Press any key to close this monitor window (servers remain running).
echo ===============================================================================

if "%1"=="--no-pause" goto :SKIP_PAUSE
if "%1"=="-y" goto :SKIP_PAUSE
if "%1"=="/y" goto :SKIP_PAUSE
pause >nul
:SKIP_PAUSE
