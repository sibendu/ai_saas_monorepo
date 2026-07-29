@echo off
setlocal
node "%~dp0.ai-loop\runtime\scripts\batch-loop.js" %*
exit /b %ERRORLEVEL%
