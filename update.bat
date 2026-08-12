@echo off
title EPIC EGCSO - Mise a Jour du Systeme de Maintenance
color 0E
echo ======================================================================
echo          EPIC EGCSO - COMPLEXE SPORTIF D'ORAN - ALGERIE
echo          MISE A JOUR DU SYSTEME ET COMPILATION PRODUCTION
echo ======================================================================
echo.

echo [1/3] Récupération des dernières mises à jour du code...
git pull

echo.
echo [2/3] Installation/mise à jour des dépendances...
call npm install --no-audit --no-fund

echo.
echo [3/3] Recompilation complète de l'application (mode Production)...
call npm run build

echo.
echo ======================================================================
echo          MISE A JOUR TERMINEE AVEC SUCCES !
echo          Vous pouvez relancer start.bat en toute sécurité.
echo ======================================================================
echo.
pause
