@echo off
setlocal
title WiseResume - Deploy Hubs

echo ================================
echo  WiseResume Hub Deployer
echo ================================
echo.
echo Redeploying the current Appwrite hubs from scripts\deploy_hubs.cjs.
echo RevenueCat webhook deployment has been removed.
echo.

cd /d "%~dp0"

:: Load keys from .env.deploy
if not exist ".env.deploy" (
    echo ERROR: .env.deploy file not found.
    echo Create it with: APPWRITE_API_KEY=your_key_here
    pause
    exit /b 1
)

for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env.deploy") do (
    if not "%%a"=="" set "%%a=%%b"
)

if "%APPWRITE_API_KEY%"=="" (
    echo ERROR: APPWRITE_API_KEY is not set in .env.deploy.
    pause
    exit /b 1
)

if "%APPWRITE_API_KEY%"=="paste_your_api_key_here" (
    echo ERROR: You haven't set your API key in .env.deploy yet.
    echo Open .env.deploy and replace paste_your_api_key_here with your real key.
    pause
    exit /b 1
)

if not exist "scripts\deploy_hubs.cjs" (
    echo ERROR: scripts\deploy_hubs.cjs was not found.
    echo Make sure this file is being run from the WiseResume repo folder.
    pause
    exit /b 1
)

if exist "revenuecat-webhook.tar.gz" (
    echo Removing stale RevenueCat webhook archive...
    del /f /q "revenuecat-webhook.tar.gz"
)

echo Starting deployment...
echo.
node scripts\deploy_hubs.cjs
if errorlevel 1 (
    echo.
    echo ================================
    echo  Deployment failed. Check output above.
    echo ================================
    pause
    exit /b 1
)

echo.
echo ================================
echo  Done! All current hubs processed.
echo ================================
pause
