const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  const baseOptions = {
    hostname: '127.0.0.1',
    port: 3001,
    headers: { 'Content-Type': 'application/json' }
  };

  console.log('=== 测试 1: 获取案件列表 ===');
  const listResult = await makeRequest({ ...baseOptions, path: '/api/reports', method: 'GET' });
  console.log('状态码:', listResult.status);
  console.log('返回:', JSON.stringify(listResult.body).substring(0, 200));

  console.log('\n=== 测试 2: 创建报案 ===');
  const reportData = JSON.stringify({
    reporter_name: '测试用户',
    reporter_phone: '13800138000',
    accident_time: '2024-01-15 10:30:00',
    accident_location: '北京市朝阳区测试路',
    accident_description: '追尾事故，前保险杠受损',
    vehicle_plate: '京A12345',
    vehicle_brand: '大众',
    vehicle_model: '迈腾'
  });
  const createResult = await makeRequest(
    { ...baseOptions, path: '/api/reports', method: 'POST' },
    reportData
  );
  console.log('状态码:', createResult.status);
  console.log('返回:', JSON.stringify(createResult.body).substring(0, 300));
  
  const reportId = createResult.body?.data?.id;
  if (!reportId) {
    console.log('创建报案失败，终止测试');
    return;
  }
  console.log('案件ID:', reportId);

  console.log('\n=== 测试 3: 无照片提交定损（预期失败） ===');
  const noPhotoResult = await makeRequest(
    { ...baseOptions, path: `/api/reports/${reportId}/submit-assessment`, method: 'POST' },
    JSON.stringify({ operator: '定损员测试' })
  );
  console.log('状态码:', noPhotoResult.status);
  console.log('错误提示:', noPhotoResult.body?.error);
  const hasPhotoError = noPhotoResult.body?.error?.includes('照片');
  console.log('是否提示照片问题:', hasPhotoError ? '✅ 是' : '❌ 否');

  console.log('\n=== 测试 4: 阈值配置 ===');
  const thresholdResult = await makeRequest({ ...baseOptions, path: '/api/thresholds', method: 'GET' });
  console.log('状态码:', thresholdResult.status);
  console.log('阈值:', JSON.stringify(thresholdResult.body));

  console.log('\n=== 测试 5: 状态列表 ===');
  const statusResult = await makeRequest({ ...baseOptions, path: '/api/status-list', method: 'GET' });
  console.log('状态码:', statusResult.status);
  console.log('状态数:', statusResult.body?.data?.length);

  console.log('\n=== 测试完成 ===');
}

runTests().catch(console.error);
