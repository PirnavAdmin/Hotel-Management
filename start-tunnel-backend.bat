@echo off
setlocal
title Cloudflare Tunnel - Backend API (Port 5018)
echo ========================================================
echo  Starting Cloudflare Tunnel for Backend API (Port 5018)
echo ========================================================
echo.
echo Checking ASP.NET Core backend on http://127.0.0.1:5018 ...

set /a WAIT_COUNT=0
:wait_backend
curl.exe -s -o nul --max-time 2 http://127.0.0.1:5018/swagger/index.html >nul 2>&1
if %errorlevel%==0 goto backend_ready
set /a WAIT_COUNT+=1
if %WAIT_COUNT% GEQ 15 (
    echo [WARN] Backend on http://127.0.0.1:5018 is not responding yet.
    echo        Ensure the backend is running to prevent Cloudflare HTTP 530 errors.
    echo        Starting Cloudflare Tunnel anyway...
    goto start_tunnel
)
if %WAIT_COUNT%==1 echo [WAIT] Waiting for ASP.NET Core backend on http://127.0.0.1:5018 ...
timeout /t 2 /nobreak >nul
goto wait_backend

:backend_ready
echo [OK] ASP.NET Core backend is reachable on http://127.0.0.1:5018.

:start_tunnel
echo.
cloudflared tunnel --url http://127.0.0.1:5018
pause
