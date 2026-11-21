@echo off
title ZOMBIE HUNT - Tactical Arena Server
color 0A
echo ======================================================
echo      ZOMBIE HUNT - LAUNCHING MULTIPLAYER SERVER
echo ======================================================
cd /d "%~dp0server"
if not exist "node_modules" (
    echo Installing required packages...
    call npm install
)
start "" "http://localhost:3000"
node server.js
pause