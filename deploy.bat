@echo off
title WiseResume — Deploy Hubs

echo ================================
echo  WiseResume Hub Deployer
echo ================================
echo.

:: Load keys from .env.deploy
if not exist ".env.deploy" (
    echo ERROR: .env.deploy file not found.
    echo Create it with: APPWRITE_API_KEY=your_key_here
    pause
    exit /b 1
)

for /f "usebackq tokens=1,2 delims==" %%a in (".env.deploy") do (
    set "%%a=%%b"
)

if "%APPWRITE_API_KEY%"=="paste_your_api_key_here" (
    echo ERROR: You haven't set your API key in .env.deploy yet.
    echo Open .env.deploy and replace paste_your_api_key_here with your real key.
    pause
    exit /b 1
)

echo Starting deployment...
echo.
node scripts/deploy_hubs.cjs

echo.
echo ================================
echo  Done! Check output above.
echo ================================
pause
