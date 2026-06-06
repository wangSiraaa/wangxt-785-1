const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3003,
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

async function test() {
  console.log('=== 开始调试测试 ===\n');

  // 1. 创建报案
  console.log('1. 创建报案...');
  const r1 = await request('POST', '/reports', {
    reporter_name: '测试',
    reporter_phone: '13800000000',
    accident_time: new Date().toISOString(),
    accident_location: '测试',
    accident_description: '测试',
    vehicle_plate: '测A11111',
    vehicle_brand: '测试',
    vehicle_model: '测试'
  });
  console.log('   结果:', JSON.stringify(r1.data, null, 2));
  const id = r1.data.data.id;
  console.log('   案件ID:', id);

  // 2. 上传照片
  console.log('\n2. 上传照片...');
  const r2 = await request('POST', `/reports/${id}/photos`, {
    photo_type: 'scene',
    damage_part: '现场',
    file_name: 'test.jpg',
    file_path: '/test.jpg',
    upload_by: '测试'
  });
  console.log('   结果:', JSON.stringify(r2.data, null, 2));

  // 3. 提交查勘
  console.log('\n3. 提交查勘...');
  const r3 = await request('POST', `/reports/${id}/submit-survey`, { operator: '测试' });
  console.log('   结果:', JSON.stringify(r3.data, null, 2));

  // 4. 保存定损
  console.log('\n4. 保存定损...');
  const r4 = await request('POST', `/reports/${id}/damage-items`, {
    items: [
      { damage_part: '前保险杠', damage_type: 'repair', item_name: '维修', quantity: 1, unit_price: 1000, labor_fee: 200, parts_source: 'original' }
    ],
    operator: '测试'
  });
  console.log('   结果:', JSON.stringify(r4.data, null, 2));

  console.log('\n=== 调试结束 ===');
}

test().catch(e => console.error('错误:', e));
