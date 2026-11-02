@echo off
title Cloudflare Tunnel - Frontend UI (Port 5173)
echo ========================================================
echo  Starting Cloudflare Tunnel for Frontend UI (Port 5173)
echo ========================================================
echo.
cloudflared tunnel --url http://localhost:5173
pause
