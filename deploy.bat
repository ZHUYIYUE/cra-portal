@echo off
chcp 65001 >nul
echo ========================================
echo   CRA Portal 一键部署脚本
echo ========================================
echo.

cd /d "C:\Users\25474\Downloads\cra-portal"

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
git commit -m "update: %date% %time%"
git push origin main

echo.
echo [3/4] 同步到 gh-pages 分支...
git checkout gh-pages
git checkout main -- index.html static
git add -A
git commit -m "deploy: %date% %time%"
git push origin gh-pages

echo.
echo [4/4] 切回 main 分支...
git checkout main

echo.
echo ========================================
echo   部署完成！
echo   网址: https://zhuyiyue.github.io/cra-portal/
echo   约1-2分钟后生效
echo ========================================
pause
