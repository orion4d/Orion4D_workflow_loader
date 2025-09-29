@echo off
chcp 65001 >nul 2>&1
setlocal
setlocal enabledelayedexpansion
rem Commentez cette ligne si elle pose problème
rem chcp 65001 >nul
title Création d'une jonction

echo.
echo === Création d'une jonction de dossier sous Windows ===
echo.
echo IMPORTANT: Veuillez entrer les chemins SANS guillemets.
echo.

:askSource
set "SRC="
set /p SRC="Chemin complet du dossier SOURCE (ex: D:\Models) : "
rem Suppression des guillemets éventuels
set "SRC=%SRC:"=%"
if not defined SRC (
    echo [ERREUR] Le chemin source ne peut pas être vide.
    pause
    goto askSource
)
if not exist "%SRC%" (
    echo [ERREUR] Dossier source "%SRC%" n'existe pas ou est inaccessible.
    pause
    goto askSource
)

:askDest
set "DST="
set /p DST="Chemin du dossier CIBLE PARENT (où sera créé le lien) : "
rem Suppression des guillemets éventuels
set "DST=%DST:"=%"
if not defined DST (
    echo [ERREUR] Le chemin cible ne peut pas être vide.
    pause
    goto askDest
)
if not exist "%DST%" (
    echo [ERREUR] Dossier cible PARENT "%DST%" n'existe pas.
    pause
    goto fin
)

set "TEMP_SRC=%SRC%"
call :CleanEndSlash TEMP_SRC
for %%F in ("%TEMP_SRC%") do set "LINKNAME=%%~nxF"
set "LINKPATH=%DST%\%LINKNAME%"

if exist "%LINKPATH%" (
    echo [ERREUR] "%LINKPATH%" existe déjà !
    pause
    goto fin
)

echo.
echo *** Résumé ***
echo Source      : "%SRC%"
echo Cible (lien): "%LINKPATH%"
echo.

set "CONT="
set /p CONT="Continuer et créer la jonction ? (O/N) : "
if /I not "%CONT%"=="O" (
    echo Opération annulée.
    pause
    goto fin
)

mklink /J "%LINKPATH%" "%SRC%"
if !errorlevel! neq 0 (
    echo [ERREUR] La création du lien a échoué. Vérifiez les droits d'administrateur.
) else (
    echo [SUCCÈS] La jonction a été créée !
)
pause
goto fin

:CleanEndSlash
setlocal enabledelayedexpansion
set "temp=!%1!"
if defined temp if "!temp:~-1!"=="\" set "temp=!temp:~0,-1!"
endlocal & set "%1=%temp%"
goto :eof

:fin
endlocal
