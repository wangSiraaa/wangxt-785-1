const { initDatabase, prepare } = require('./server/db');

async function test() {
  console.log('开始测试数据库...');
  try {
    await initDatabase();
    console.log('✅ 数据库初始化成功');
    
    const thresholds = prepare('SELECT * FROM threshold_config').all();
    console.log('✅ 阈值配置:', thresholds);
    
    console.log('\n🎉 所有测试通过！');
  } catch (e) {
    console.error('❌ 测试失败:', e);
    console.error(e.stack);
    process.exit(1);
  }
}

test();
