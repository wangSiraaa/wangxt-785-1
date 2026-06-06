const http = require('http');

const BASE_URL = 'localhost';
const PORT = process.env.PORT || 3001;

let passed = 0;
let failed = 0;
let reportIdNoPhoto = null;
let reportIdOverThreshold = null;

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function logTest(name, success, message = '') {
  if (success) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
    if (message) console.log(`     错误: ${message}`);
  }
}

async function waitForServer() {
  console.log('等待服务器启动...');
  for (let i = 0; i < 30; i++) {
    try {
      await request('GET', '/thresholds');
      console.log('服务器已就绪\n');
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.log('服务器启动超时');
  return false;
}

async function runTests() {
  console.log('========================================');
  console.log('  保险查勘定损系统 - 验收测试');
  console.log('========================================\n');

  const serverReady = await waitForServer();
  if (!serverReady) {
    console.log('请先启动服务器: npm start\n');
    process.exit(1);
  }

  console.log('【测试1】阈值配置查询');
  try {
    const res = await request('GET', '/thresholds');
    logTest('查询阈值配置成功', res.data.success && res.data.data.length > 0);
    const surveyor = res.data.data.find(t => t.role === 'surveyor');
    logTest('查勘员权限阈值配置正确', surveyor && surveyor.max_amount === 5000);
  } catch (e) {
    logTest('阈值配置查询', false, e.message);
  }

  console.log('\n【测试2】创建报案单（无照片定损测试用）');
  try {
    const res = await request('POST', '/reports', {
      reporter_name: '测试用户A',
      reporter_phone: '13900000001',
      accident_time: new Date().toISOString(),
      accident_location: '测试地点A',
      accident_description: '测试事故A',
      vehicle_plate: '测A12345',
      vehicle_brand: '测试品牌',
      vehicle_model: '测试型号'
    });
    logTest('报案创建成功', res.data.success && res.data.data.id);
    reportIdNoPhoto = res.data.data.id;
    logTest('初始状态为待查勘', res.data.data.status === 'pending_survey');
  } catch (e) {
    logTest('创建报案单', false, e.message);
  }

  console.log('\n【测试3】验证：无现场照片不能提交定损');
  try {
    const items = [{
      damage_part: '前保险杠',
      damage_type: 'repair',
      item_name: '前保险杠维修',
      quantity: 1,
      unit_price: 1000,
      labor_fee: 200,
      parts_source: 'original'
    }];

    const res = await request('POST', `/reports/${reportIdNoPhoto}/damage-items`, {
      items: items,
      operator: '定损员测试'
    });
    
    logTest('缺少照片时保存定损项目被拒绝', !res.data.success && 
      res.data.error && res.data.error.includes('缺少现场照片'));
  } catch (e) {
    logTest('无照片定损校验', false, e.message);
  }

  console.log('\n【测试4】创建报案单（超权限复核测试用）');
  try {
    const res = await request('POST', '/reports', {
      reporter_name: '测试用户B',
      reporter_phone: '13900000002',
      accident_time: new Date().toISOString(),
      accident_location: '测试地点B',
      accident_description: '测试事故B-大额定损',
      vehicle_plate: '测B67890',
      vehicle_brand: '奥迪',
      vehicle_model: 'A8L'
    });
    logTest('大额案件创建成功', res.data.success && res.data.data.id);
    reportIdOverThreshold = res.data.data.id;
  } catch (e) {
    logTest('创建大额报案单', false, e.message);
  }

  console.log('\n【测试5】为大额案件上传现场照片');
  try {
    const res = await request('POST', `/reports/${reportIdOverThreshold}/photos`, {
      photo_type: 'scene',
      damage_part: '前保险杠',
      file_name: '现场照片1.jpg',
      file_path: '/uploads/test1.jpg',
      upload_by: '查勘员测试',
      description: '测试现场照片'
    });
    logTest('照片上传成功', res.data.success);
  } catch (e) {
    logTest('上传照片', false, e.message);
  }

  console.log('\n【测试6】提交查勘');
  try {
    const res = await request('POST', `/reports/${reportIdOverThreshold}/submit-survey`, {
      operator: '查勘员测试'
    });
    logTest('查勘提交成功', res.data.success && res.data.data.status === 'pending_assess');
  } catch (e) {
    logTest('提交查勘', false, e.message);
  }

  console.log('\n【测试7】验证：同一损失部位不能重复计价');
  try {
    const items = [
      {
        damage_part: '前保险杠',
        damage_type: 'repair',
        item_name: '前保险杠喷漆',
        quantity: 1,
        unit_price: 500,
        labor_fee: 200,
        parts_source: 'original'
      },
      {
        damage_part: '前保险杠',
        damage_type: 'replace',
        item_name: '前保险杠更换',
        quantity: 1,
        unit_price: 2000,
        labor_fee: 300,
        parts_source: 'original'
      }
    ];

    const res = await request('POST', `/reports/${reportIdOverThreshold}/damage-items`, {
      items: items,
      operator: '定损员测试'
    });
    
    logTest('同一部位重复计价被拒绝', !res.data.success && 
      res.data.error && res.data.error.includes('同一损失部位不能重复计价'));
  } catch (e) {
    logTest('重复部位校验', false, e.message);
  }

  console.log('\n【测试8】录入超权限定损项目（总金额34000 > 5000）');
  try {
    const items = [
      {
        damage_part: '发动机',
        damage_type: 'repair',
        item_name: '发动机大修',
        quantity: 1,
        unit_price: 15000,
        labor_fee: 5000,
        parts_source: 'original'
      },
      {
        damage_part: '变速箱',
        damage_type: 'replace',
        item_name: '变速箱总成更换',
        quantity: 1,
        unit_price: 12000,
        labor_fee: 2000,
        parts_source: 'original'
      }
    ];

    const res = await request('POST', `/reports/${reportIdOverThreshold}/damage-items`, {
      items: items,
      operator: '定损员测试'
    });
    logTest('定损项目保存成功', res.data.success);
    logTest('状态变为定损中', res.data.data.status === 'assessing');
  } catch (e) {
    logTest('录入定损项目', false, e.message);
  }

  console.log('\n【测试9】提交定损，验证超权限自动进入复核队列');
  try {
    const res = await request('POST', `/reports/${reportIdOverThreshold}/submit-assessment`, {
      operator: '定损员测试'
    });
    logTest('定损提交成功', res.data.success);
    logTest('状态变为待复核', res.data.data.status === 'pending_review');
    logTest('生成复核记录', res.data.data.reviews && res.data.data.reviews.length > 0);
    
    const review = res.data.data.reviews[res.data.data.reviews.length - 1];
    logTest('复核金额正确', review && review.total_amount === 34000);
    logTest('阈值正确', review && review.threshold === 5000);
  } catch (e) {
    logTest('超权限复核校验', false, e.message);
  }

  console.log('\n【测试10】验证复核队列包含该案件');
  try {
    const res = await request('GET', '/review-queue');
    logTest('复核队列查询成功', res.data.success);
    const found = res.data.data.some(r => r.id === reportIdOverThreshold);
    logTest('案件在复核队列中', found);
  } catch (e) {
    logTest('复核队列查询', false, e.message);
  }

  console.log('\n【测试11】开始复核');
  try {
    const res = await request('POST', `/reports/${reportIdOverThreshold}/start-review`, {
      reviewer: '审核员测试'
    });
    logTest('开始复核成功', res.data.success && res.data.data.status === 'reviewing');
  } catch (e) {
    logTest('开始复核', false, e.message);
  }

  console.log('\n【测试12】复核退回');
  try {
    const res = await request('POST', `/reports/${reportIdOverThreshold}/process-review`, {
      reviewer: '审核员测试',
      result: 'reject',
      opinion: '定损金额过高，请重新核实'
    });
    logTest('复核退回成功', res.data.success && res.data.data.status === 'review_rejected');
  } catch (e) {
    logTest('复核退回', false, e.message);
  }

  console.log('\n【测试13】验证：复核退回后再次提交必须填写调整说明');
  try {
    const items = [
      {
        damage_part: '发动机',
        damage_type: 'repair',
        item_name: '发动机大修',
        quantity: 1,
        unit_price: 15000,
        labor_fee: 5000,
        parts_source: 'original'
      }
    ];

    const res = await request('POST', `/reports/${reportIdOverThreshold}/damage-items`, {
      items: items,
      operator: '定损员测试'
    });
    
    logTest('未填写调整说明被拒绝', !res.data.success && 
      res.data.error && res.data.error.includes('调整说明'));
  } catch (e) {
    logTest('调整说明校验', false, e.message);
  }

  console.log('\n【测试14】填写调整说明后重新提交定损');
  try {
    const items = [
      {
        damage_part: '发动机',
        damage_type: 'repair',
        item_name: '发动机大修',
        quantity: 1,
        unit_price: 15000,
        labor_fee: 5000,
        parts_source: 'original',
        adjustment_note: '已核实配件价格为原厂价格，工时费符合标准'
      },
      {
        damage_part: '变速箱',
        damage_type: 'replace',
        item_name: '变速箱总成更换',
        quantity: 1,
        unit_price: 12000,
        labor_fee: 2000,
        parts_source: 'original',
        adjustment_note: '变速箱损坏严重，无维修价值，建议更换'
      }
    ];

    const res = await request('POST', `/reports/${reportIdOverThreshold}/damage-items`, {
      items: items,
      operator: '定损员测试'
    });
    logTest('带调整说明的定损保存成功', res.data.success);

    const submitRes = await request('POST', `/reports/${reportIdOverThreshold}/submit-assessment`, {
      operator: '定损员测试'
    });
    logTest('重新提交后再次进入复核', submitRes.data.data.status === 'pending_review');
  } catch (e) {
    logTest('调整说明后提交', false, e.message);
  }

  console.log('\n【测试15】验证案件状态历史留痕');
  try {
    const res = await request('GET', `/reports/${reportIdOverThreshold}`);
    const history = res.data.data.status_history;
    logTest('状态历史记录存在', history && history.length >= 5);
    
    const statuses = history.map(h => h.to_status);
    logTest('包含完整状态流转', 
      statuses.includes('pending_survey') &&
      statuses.includes('surveying') &&
      statuses.includes('pending_assess') &&
      statuses.includes('assessing') &&
      statuses.includes('pending_review')
    );
  } catch (e) {
    logTest('状态历史留痕', false, e.message);
  }

  console.log('\n========================================');
  console.log('  测试结果汇总');
  console.log('========================================');
  console.log(`  通过: ${passed} 项`);
  console.log(`  失败: ${failed} 项`);
  console.log(`  总计: ${passed + failed} 项`);
  console.log('========================================');

  if (failed > 0) {
    console.log('\n❌ 存在测试失败，请检查系统功能');
    process.exit(1);
  } else {
    console.log('\n✅ 所有验收测试通过！');
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('测试执行出错:', e);
  process.exit(1);
});
