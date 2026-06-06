console.log('开始测试服务器启动...');
process.on('exit', (code) => {
  console.log(`进程退出码: ${code}`);
});

process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

try {
  const path = require('path');
  console.log('当前目录:', __dirname);
  console.log('尝试加载 db.js...');
  const { initDatabase } = require('./server/db');
  console.log('db.js 加载成功');
  
  console.log('尝试初始化数据库...');
  initDatabase().then(() => {
    console.log('数据库初始化成功');
    console.log('尝试加载 claims.js...');
    const claimsRouter = require('./server/routes/claims');
    console.log('claims.js 加载成功');
    console.log('所有模块加载成功');
    process.exit(0);
  }).catch(err => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });
} catch (err) {
  console.error('加载模块失败:', err);
  process.exit(1);
}
