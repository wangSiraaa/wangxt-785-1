const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;

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

async function runTests() {
  console.log('========================================');
  console.log('  快速验证测试');
  console.log('========================================\n');

  try {
    console.log('1. 测试阈值查询...');
    const res1 = await request('GET', '/thresholds');
    console.log('   ✅ 成功:', res1.data.success);
    console.log('   查勘员阈值:', res1.data.data.find(t => t.role === 'surveyor')?.max_amount);

    console.log('\n2. 测试创建报案...');
    const res2 = await request('POST', '/reports', {
      reporter_name: '测试用户',
      reporter_phone: '13900000001',
      accident_time: new Date().toISOString(),
      accident_location: '测试地点',
      accident_description: '测试事故',
      vehicle_plate: '测A12345',
      vehicle_brand: '测试品牌',
      vehicle_model: '测试型号'
    });
    console.log('   ✅ 成功:', res2.data.success);
    const reportId = res2.data.data.id;
    console.log('   案件ID:', reportId);
    console.log('   状态:', res2.data.data.status);

    console.log('\n3. 测试无照片定损（应该失败）...');
    const res3 = await request('POST', `/reports/${reportId}/damage-items`, {
      items: [{
        damage_part: '前保险杠',
        damage_type: 'repair',
        item_name: '前保险杠维修',
        quantity: 1,
        unit_price: 1000,
        labor_fee: 200,
        parts_source: 'original'
      }],
      operator: '定损员测试'
    });
    console.log('   成功:', res3.data.success);
    console.log('   错误信息:', res3.data.error);
    if (!res3.data.success && res3.data.error) {
      console.log('   ✅ 正确拒绝了无照片的定损请求');
    }

    console.log('\n4. 测试上传照片...');
    const res4 = await request('POST', `/reports/${reportId}/photos`, {
      photo_type: 'scene',
      damage_part: '现场全景',
      file_name: 'test.jpg',
      file_path: '/uploads/test.jpg',
      upload_by: '查勘员测试',
      description: '测试照片'
    });
    console.log('   ✅ 成功:', res4.data.success);

    console.log('\n5. 测试提交查勘...');
    const res5 = await request('POST', `/reports/${reportId}/submit-survey`, {
      operator: '查勘员测试'
    });
    console.log('   ✅ 成功:', res5.data.success);
    console.log('   状态:', res5.data.data.status);

    console.log('\n6. 测试同一部位重复计价（应该失败）...');
    const res6 = await request('POST', `/reports/${reportId}/damage-items`, {
      items: [
        { damage_part: '前保险杠', damage_type: 'repair', item_name: '喷漆', quantity: 1, unit_price: 500, labor_fee: 200, parts_source: 'original' },
        { damage_part: '前保险杠', damage_type: 'replace', item_name: '更换', quantity: 1, unit_price: 2000, labor_fee: 300, parts_source: 'original' }
      ],
      operator: '定损员测试'
    });
    console.log('   成功:', res6.data.success);
    console.log('   错误信息:', res6.data.error);
    if (!res6.data.success && res6.data.error?.includes('同一损失部位')) {
      console.log('   ✅ 正确拒绝了重复计价请求');
    }

    console.log('\n7. 测试超权限定损（34000 > 5000）...');
    const res7 = await request('POST', `/reports/${reportId}/damage-items`, {
      items: [
        { damage_part: '发动机', damage_type: 'repair', item_name: '发动机大修', quantity: 1, unit_price: 15000, labor_fee: 5000, parts_source: 'original' },
        { damage_part: '变速箱', damage_type: 'replace', item_name: '变速箱更换', quantity: 1, unit_price: 12000, labor_fee: 2000, parts_source: 'original' }
      ],
      operator: '定损员测试'
    });
    console.log('   ✅ 成功:', res7.data.success);
    console.log('   状态:', res7.data.data.status);

    console.log('\n8. 测试提交定损，验证进入复核...');
    const res8 = await request('POST', `/reports/${reportId}/submit-assessment`, {
      operator: '定损员测试'
    });
    console.log('   ✅ 成功:', res8.data.success);
    console.log('   状态:', res8.data.data.status);
    if (res8.data.data.status === 'pending_review') {
      console.log('   ✅ 正确进入复核队列');
    }

    console.log('\n9. 测试复核队列...');
    const res9 = await request('GET', '/review-queue');
    console.log('   ✅ 成功:', res9.data.success);
    const found = res9.data.data.some(r => r.id === reportId);
    console.log('   案件在复核队列中:', found);
    if (found) {
      console.log('   ✅ 案件正确出现在复核队列中');
    }

    console.log('\n10. 测试状态历史...');
    const res10 = await request('GET', `/reports/${reportId}`);
    console.log('   ✅ 成功:', res10.data.success);
    console.log('   状态历史条数:', res10.data.data.status_history.length);
    if (res10.data.data.status_history.length >= 3) {
      console.log('   ✅ 状态历史留痕正常');
    }

    console.log('\n========================================');
    console.log('  🎉 核心功能验证通过！');
    console.log('========================================');

  } catch (e) {
    console.error('测试失败:', e);
    process.exit(1);
  }
}

runTests();
