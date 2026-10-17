@echo off
setlocal
cd /d "%~dp0"
title Gold Miner
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Please install Node.js 24 and try again.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Installing game dependencies...
  call npm install
  if errorlevel 1 (
    echo Installation failed. Please check your internet connection.
    pause
    exit /b 1
  )
)
echo Starting Gold Miner in your browser...
echo Keep this window open while playing. Close it to stop the server.
call npm run dev -- --open
if errorlevel 1 pause
