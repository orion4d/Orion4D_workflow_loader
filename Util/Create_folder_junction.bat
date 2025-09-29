@echo off
chcp 65001 >nul 2>&1
setlocal
setlocal enabledelayedexpansion
rem Comment this line if it causes issues
rem chcp 65001 >nul
title Create a junction

echo.
echo === Create a folder junction in Windows ===
echo.
echo IMPORTANT: Please enter paths WITHOUT quotes.
echo.

:askSource
set "SRC="
set /p SRC="Full path of the SOURCE folder (e.g., D:\Models) : "
rem Remove any quotes
set "SRC=%SRC:"=%"
if not defined SRC (
    echo [ERROR] The source path cannot be empty.
    pause
    goto askSource
)
if not exist "%SRC%" (
    echo [ERROR] Source folder "%SRC%" does not exist or is inaccessible.
    pause
    goto askSource
)

:askDest
set "DST="
set /p DST="Path of the TARGET PARENT folder (where the link will be created) : "
rem Remove any quotes
set "DST=%DST:"=%"
if not defined DST (
    echo [ERROR] The target path cannot be empty.
    pause
    goto askDest
)
if not exist "%DST%" (
    echo [ERROR] Target PARENT folder "%DST%" does not exist.
    pause
    goto end
)

set "TEMP_SRC=%SRC%"
call :CleanEndSlash TEMP_SRC
for %%F in ("%TEMP_SRC%") do set "LINKNAME=%%~nxF"
set "LINKPATH=%DST%\%LINKNAME%"

if exist "%LINKPATH%" (
    echo [ERROR] "%LINKPATH%" already exists!
    pause
    goto end
)

echo.
echo *** Summary ***
echo Source      : "%SRC%"
echo Target link : "%LINKPATH%"
echo.

set "CONT="
set /p CONT="Continue and create the junction? (Y/N) : "
if /I not "%CONT%"=="Y" (
    echo Operation cancelled.
    pause
    goto end
)

mklink /J "%LINKPATH%" "%SRC%"
if !errorlevel! neq 0 (
    echo [ERROR] Link creation failed. Check administrator rights.
) else (
    echo [SUCCESS] The junction has been created!
)
pause
goto end

:CleanEndSlash
setlocal enabledelayedexpansion
set "temp=!%1!"
if defined temp if "!temp:~-1!"=="\" set "temp=!temp:~0,-1!"
endlocal & set "%1=%temp%"
goto :eof

:end
endlocal
