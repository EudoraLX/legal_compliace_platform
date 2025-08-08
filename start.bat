@echo off
echo 启动法律合同合规AI分析平台...
echo.

echo 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

echo 安装依赖包...
npm install

echo 启动服务器...
npm start

pause 