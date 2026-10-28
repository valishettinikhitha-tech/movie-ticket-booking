@echo off
title MovieBox Telugu Cinema Server
echo ========================================================
echo        Starting MovieBox Telugu Cinema Server...
echo ========================================================
echo.
cd /d "%~dp0backend"
start http://localhost:3000
"C:\Program Files\nodejs\node.exe" server.js
pause

