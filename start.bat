@echo off
REM ============================================================
REM  Oyu · Суралцах орон зай — Windows эхлүүлэгч
REM ============================================================
setlocal

echo.
echo   Oyu · Суралцах орон зайг асааж байна...
echo.

REM --- Python 3.14-ийг олох ---
set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY if exist "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" set "PY=%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
if not defined PY where py >nul 2>nul && set "PY=py"

if not defined PY (
  echo   [Алдаа] Python олдсонгүй. Python 3.14-ийг суулгана уу.
  pause & exit /b 1
)

echo   Python: %PY%
echo   Хамаарлыг шалгаж байна...
"%PY%" -m pip install -q -r "%~dp0backend\requirements.txt"

echo.
echo   Сервер:  http://127.0.0.1:8000
echo   Зогсоох: Ctrl+C
echo.

cd /d "%~dp0"
"%PY%" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

endlocal
