@echo off
setlocal
title Cloudflare Tunnel - Frontend UI (Port 5173)
echo ========================================================
echo  Starting Cloudflare Tunnel for Frontend UI (Port 5173)
echo ========================================================
echo.
echo Checking Vite frontend dev server on http://127.0.0.1:5173 ...

set /a WAIT_COUNT=0
:wait_frontend
curl.exe -s -o nul --max-time 2 http://127.0.0.1:5173/ >nul 2>&1
if %errorlevel%==0 goto frontend_ready
set /a WAIT_COUNT+=1
if %WAIT_COUNT% GEQ 15 (
    echo [WARN] Vite dev server on http://127.0.0.1:5173 is not responding yet.
    echo        Run npm run dev to prevent Cloudflare HTTP 530 errors.
    echo        Starting Cloudflare Tunnel anyway...
    goto start_tunnel
)
if %WAIT_COUNT%==1 echo [WAIT] Waiting for Vite dev server on http://127.0.0.1:5173 ...
timeout /t 2 /nobreak >nul
goto wait_frontend

:frontend_ready
echo [OK] Vite dev server is reachable on http://127.0.0.1:5173.

:start_tunnel
echo.
cloudflared tunnel --url http://127.0.0.1:5173
pause
