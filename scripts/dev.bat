@echo off
title Our Archive - Development Server
cd /d "%~dp0\.."
echo [Our Archive] Starting development mode (Server + Client)...
npm run dev
pause
