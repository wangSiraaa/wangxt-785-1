const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
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
  // 1. 创建报案
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
  console.log('1. 创建报案:');
  console.log('   success:', r1.data.success);
  console.log('   data:', JSON.stringify(r1.data.data).substring(0, 200));
  const id = r1.data.data.id;
  
  // 2. 尝试无照片保存定损
  console.log('\n2. 尝试无照片保存定损...');
  const r2 = await request('POST', `/reports/${id}/damage-items`, {
    items: [{ damage_part: '前保险杠', damage_type: 'repair', item_name: '维修', quantity: 1, unit_price: 1000, labor_fee: 200, parts_source: 'original' }],
    operator: '测试'
  });
  console.log('   success:', r2.data.success);
  console.log('   error:', r2.data.error);
  console.log('   data.status:', r2.data.data?.status);
}

test().catch(e => console.error('错误:', e));
