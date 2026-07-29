@echo off
setlocal
node "%~dp0.ai-loop\runtime\scripts\init-loop.js" --root "%CD%" %*
exit /b %ERRORLEVEL%
