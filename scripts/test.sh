#!/bin/bash

echo "========================================"
echo "  保险查勘定损系统 - 验收测试"
echo "========================================"
echo ""

echo "检查服务是否启动..."
curl -s http://localhost:3001/api/thresholds > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "服务未启动，正在启动服务..."
    npm start > /tmp/server.log 2>&1 &
    SERVER_PID=$!
    
    echo "等待服务就绪..."
    for i in {1..30}; do
        curl -s http://localhost:3001/api/thresholds > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "服务已启动 (PID: $SERVER_PID)"
            break
        fi
        sleep 1
    done
fi

echo ""
echo "运行验收测试..."
echo ""

node tests/acceptance.js
TEST_RESULT=$?

echo ""
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ 验收测试通过！"
else
    echo "❌ 验收测试失败，请检查日志"
fi

if [ -n "$SERVER_PID" ]; then
    echo ""
    echo "停止测试服务 (PID: $SERVER_PID)..."
    kill $SERVER_PID 2>/dev/null
fi

exit $TEST_RESULT
