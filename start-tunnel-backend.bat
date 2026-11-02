@echo off
title Cloudflare Tunnel - Backend API (Port 5018)
echo ========================================================
echo  Starting Cloudflare Tunnel for Backend API (Port 5018)
echo ========================================================
echo.
cloudflared tunnel --url http://localhost:5018
pause
