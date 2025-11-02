@echo off

echo Building Frontend React...

cd frontend
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo Copying build to public/...

cd ..
if exist public (
    rmdir /s /q public
)
mkdir public
xcopy /E /I /Y frontend\dist\* public\

echo Build complete!
echo Run 'go run main.go' to start the server

pause

