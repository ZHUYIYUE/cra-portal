@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "PROJECT_DIR=D:\办公\项目\cra-portal"
set "SITE_URL=https://zhuyiyue.github.io/cra-portal/"

echo ========================================
echo   CRA Portal 一键部署脚本
echo ========================================
echo.

where git >nul 2>nul
if errorlevel 1 (
    echo [错误] 当前终端找不到 git 命令。
    echo 请先安装 Git for Windows，或把 git.exe 所在目录加入 PATH。
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%\.git" (
    echo [错误] 未找到项目 Git 仓库: %PROJECT_DIR%
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%"

echo [1/4] 切换到 main 分支...
git checkout main
if errorlevel 1 (
    echo 切换失败！请检查是否有未保存的更改。
    pause
    exit /b 1
)

echo.
echo [2/4] 提交 main 分支更改...
git add -A
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "update: %date% %time%"
    if errorlevel 1 (
        echo main 提交失败。
        pause
        exit /b 1
    )
) else (
    echo main 没有需要提交的更改。
)
git push origin main
if errorlevel 1 (
    echo main 推送失败。
    pause
    exit /b 1
)

echo.
echo [3/4] 同步到 gh-pages 分支...
git checkout gh-pages
if errorlevel 1 (
    echo 切换 gh-pages 失败。
    pause
    exit /b 1
)
git checkout main -- index.html static
git add -A
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "deploy: %date% %time%"
    if errorlevel 1 (
        echo gh-pages 提交失败。
        pause
        exit /b 1
    )
) else (
    echo gh-pages 没有需要提交的更改。
)
git push origin gh-pages
if errorlevel 1 (
    echo gh-pages 推送失败。
    pause
    exit /b 1
)

echo.
echo [4/4] 切回 main 分支...
git checkout main

echo.
echo ========================================
echo   部署完成！
echo   网址: %SITE_URL%
echo   约1-2分钟后生效
echo ========================================
pause