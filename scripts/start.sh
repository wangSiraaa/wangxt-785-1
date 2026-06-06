#!/bin/bash

echo "========================================"
echo "  保险查勘定损系统 - 启动脚本"
echo "========================================"

echo ""
echo "检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "安装前端依赖..."
    cd client && npm install && cd ..
fi

if [ ! -d "client/build" ]; then
    echo "构建前端..."
    cd client && npm run build && cd ..
fi

echo ""
echo "初始化数据库..."
node server/seed.js

echo ""
echo "启动服务..."
echo "服务地址: http://localhost:3001"
echo ""
echo "启动完成后，可运行验收测试:"
echo "  npm run test:acceptance"
echo ""

npm start
