@echo off
title Our Archive - CLI Server
cd /d "%~dp0\.."

REM Check if frontend is built
if not exist "packages\client\dist\index.html" (
    echo [Our Archive] Building frontend for first run...
    call npm run build
)

echo [Our Archive] Launching Backend Server...
call npm run start
pause
