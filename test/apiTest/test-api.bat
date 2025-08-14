@echo off
chcp 65001 >nul
echo ========================================
echo        API Key 测试工具
echo ========================================
echo.

echo 正在检查依赖...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
echo.

echo 正在检查依赖包...
if not exist "node_modules" (
    echo 📦 正在安装依赖包...
    npm install
    if errorlevel 1 (
        echo ❌ 依赖包安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖包安装完成
) else (
    echo ✅ 依赖包已存在
)

echo.
echo 🚀 开始运行 API Key 测试...
echo.

node test-api-key.js

echo.
echo 测试完成！按任意键退出...
pause >nul 