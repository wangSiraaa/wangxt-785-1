const http = require('http');

const PORT = 3005;

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: `/api${path}`,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}

async function run() {
  console.log('========================================');
  console.log('  保险查勘定损系统 - 核心验收测试');
  console.log('========================================\n');

  console.log('【1】阈值配置');
  try {
    const r = await request('GET', '/thresholds');
    check('阈值查询成功', r.data.success);
    check('查勘员阈值5000元', r.data.data.find(t => t.role === 'surveyor')?.max_amount === 5000);
  } catch (e) { check('阈值配置', false); }

  console.log('\n【2】验证规则：无现场照片不能保存定损');
  let reportId1 = null;
  try {
    const r1 = await request('POST', '/reports', {
      reporter_name: '测试用户A', reporter_phone: '13900000001',
      accident_time: new Date().toISOString(), accident_location: '测试A',
      accident_description: '测试事故A', vehicle_plate: '测A11111',
      vehicle_brand: '大众', vehicle_model: '迈腾'
    });
    reportId1 = r1.data.data.id;
    
    const r2 = await request('POST', `/reports/${reportId1}/damage-items`, {
      items: [{ damage_part: '前保险杠', damage_type: 'repair', item_name: '维修', quantity: 1, unit_price: 1000, labor_fee: 200, parts_source: 'original' }],
      operator: '定损员'
    });
    check('无照片时保存定损被拒绝', !r2.data.success);
    check('错误提示包含照片', r2.data.error && (r2.data.error.includes('照片') || r2.data.error.includes('查勘')));
  } catch (e) { check('无照片定损校验', false); console.log('    ', e.message); }

  console.log('\n【3】完整流程：报案→查勘→定损→超权限复核');
  let reportId2 = null;
  try {
    const r1 = await request('POST', '/reports', {
      reporter_name: '测试用户B', reporter_phone: '13900000002',
      accident_time: new Date().toISOString(), accident_location: '测试B',
      accident_description: '测试事故B-大额', vehicle_plate: '测B22222',
      vehicle_brand: '奥迪', vehicle_model: 'A8L'
    });
    reportId2 = r1.data.data.id;
    check('报案创建成功', r1.data.success);

    const r2 = await request('POST', `/reports/${reportId2}/photos`, {
      photo_type: 'scene', damage_part: '现场全景',
      file_name: 'test.jpg', file_path: '/test.jpg', upload_by: '查勘员'
    });
    check('照片上传成功', r2.data.success);

    const r3 = await request('POST', `/reports/${reportId2}/submit-survey`, { operator: '查勘员' });
    check('查勘提交成功', r3.data.success);
    check('状态变为待定损', r3.data.data.status === 'pending_assess');

    const r4 = await request('POST', `/reports/${reportId2}/damage-items`, {
      items: [
        { damage_part: '发动机', damage_type: 'repair', item_name: '发动机大修', quantity: 1, unit_price: 15000, labor_fee: 5000, parts_source: 'original' },
        { damage_part: '变速箱', damage_type: 'replace', item_name: '变速箱更换', quantity: 1, unit_price: 12000, labor_fee: 2000, parts_source: 'original' }
      ],
      operator: '定损员'
    });
    check('定损保存成功', r4.data.success);
    check('总金额34000元正确', r4.data.data.total_amount === 34000);

    const r5 = await request('POST', `/reports/${reportId2}/submit-assessment`, { operator: '定损员' });
    check('定损提交成功', r5.data.success);
    check('超权限后进入待复核', r5.data.data.status === 'pending_review');

    const r6 = await request('GET', '/review-queue');
    check('复核队列包含案件', r6.data.data.some(r => r.id === reportId2));

    const r7 = await request('POST', `/reports/${reportId2}/start-review`, { reviewer: '审核员' });
    check('开始复核成功', r7.data.success);

    const r8 = await request('POST', `/reports/${reportId2}/process-review`, {
      reviewer: '审核员', result: 'reject', opinion: '价格偏高，请核实'
    });
    check('复核退回成功', r8.data.success);
    check('状态变为复核退回', r8.data.data.status === 'review_rejected');

    const r9 = await request('POST', `/reports/${reportId2}/damage-items`, {
      items: [
        { damage_part: '发动机', damage_type: 'repair', item_name: '发动机大修', quantity: 1, unit_price: 15000, labor_fee: 5000, parts_source: 'original', adjustment_note: '已核实价格合理' }
      ],
      operator: '定损员'
    });
    check('带调整说明保存成功', r9.data.success);

    const r10 = await request('POST', `/reports/${reportId2}/submit-assessment`, { operator: '定损员' });
    check('重新提交后进入待复核', r10.data.data.status === 'pending_review');

    const r11 = await request('GET', `/reports/${reportId2}`);
    check('状态历史不少于5条', r11.data.data.status_history.length >= 5);
    check('状态留痕完整', r11.data.data.status_history.some(h => h.to_status === 'pending_review'));

  } catch (e) { check('完整流程', false); console.log('    ', e.message); }

  console.log('\n========================================');
  console.log('  测试结果');
  console.log('========================================');
  console.log(`  通过: ${passed} 项`);
  console.log(`  失败: ${failed} 项`);
  console.log(`  总计: ${passed + failed} 项`);
  console.log('========================================');

  if (failed === 0) {
    console.log('\n🎉 所有核心功能验收通过！');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试未通过');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
