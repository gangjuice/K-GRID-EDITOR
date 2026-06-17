@echo off
chcp 65001 >nul
title K-GRID EDITOR - EXE 빌드

echo ============================================
echo    K-GRID EDITOR - EXE 빌드를 시작합니다
echo ============================================
echo.

REM --- Node.js 설치 여부 확인 ---
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo.
    echo   https://nodejs.org 에서 LTS 버전을 설치한 뒤
    echo   이 파일을 다시 실행해 주세요.
    echo.
    pause
    exit /b 1
)

echo [1/2] 필요한 부품을 내려받는 중입니다... (최초 1회는 몇 분 걸립니다)
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [오류] 부품 설치에 실패했습니다. 인터넷 연결을 확인해 주세요.
    pause
    exit /b 1
)

echo.
echo [2/2] 실행 파일(EXE)을 만드는 중입니다...
echo.
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [오류] 빌드에 실패했습니다.
    pause
    exit /b 1
)

echo.
echo ============================================
echo    빌드 완료!
echo    dist 폴더 안의 .exe 파일을 실행하세요.
echo ============================================
echo.

REM --- 결과물 폴더 열기 ---
if exist dist explorer dist
pause
