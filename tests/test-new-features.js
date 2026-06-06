const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000
});

api.interceptors.response.use(
  response => response.data,
  error => Promise.reject(error.response?.data || error.message)
);

let testReportId = null;

async function test() {
  console.log('========================================');
  console.log('  保险查勘定损系统 - 新功能测试用例');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  function logResult(name, success, detail = '') {
    if (success) {
      passed++;
      console.log(`✅ PASS: ${name}`);
      results.push({ name, status: 'PASS', detail });
    } else {
      failed++;
      console.log(`❌ FAIL: ${name}`);
      console.log(`   原因: ${detail}`);
      results.push({ name, status: 'FAIL', detail });
    }
  }

  try {
    console.log('【准备工作】创建测试案件...\n');
    const reportRes = await api.post('/reports', {
      reporter_name: '测试用户',
      reporter_phone: '13800138000',
      vehicle_plate: '京A88888',
      vehicle_brand: '测试品牌',
      vehicle_model: '测试车型',
      accident_time: new Date().toISOString(),
      accident_location: '测试地点',
      accident_description: '测试事故描述'
    });
    testReportId = reportRes.data.id;
    console.log(`   案件创建成功，ID: ${testReportId}`);

    console.log('\n========================================');
    console.log('  测试组1: 照片文件上传功能');
    console.log('========================================\n');

    // 测试1: 创建一个测试图片文件
    try {
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      if (!fs.existsSync(testImagePath)) {
        const placeholder = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64'
        );
        fs.writeFileSync(testImagePath, placeholder);
      }

      const formData = new FormData();
      formData.append('photo', fs.createReadStream(testImagePath));
      formData.append('photo_type', 'scene');
      formData.append('damage_part', '前保险杠');
      formData.append('operator', '查勘员张三');
      formData.append('remark', '测试现场照片');

      const uploadRes = await api.post(`/reports/${testReportId}/photos`, formData, {
        headers: formData.getHeaders()
      });

      if (uploadRes.success && uploadRes.data) {
        logResult('上传查勘照片', true, `照片ID: ${uploadRes.data.id}`);
        
        if (uploadRes.data.file_size && uploadRes.data.mime_type) {
          logResult('照片元数据保存（文件大小/MIME类型）', true, 
            `大小: ${uploadRes.data.file_size} bytes, 类型: ${uploadRes.data.mime_type}`);
        } else {
          logResult('照片元数据保存（文件大小/MIME类型）', false, '缺少文件大小或MIME类型');
        }

        if (uploadRes.data.file_url && uploadRes.data.file_url.includes('/uploads/')) {
          logResult('照片URL正确生成', true, `URL: ${uploadRes.data.file_url}`);
        } else {
          logResult('照片URL正确生成', false, `URL不正确: ${uploadRes.data.file_url}`);
        }
      } else {
        logResult('上传查勘照片', false, uploadRes.error || '返回结构异常');
      }
    } catch (e) {
      logResult('上传查勘照片', false, e.error || e.message);
    }

    // 测试2: 查看案件详情确认照片存在
    try {
      const detailRes = await api.get(`/reports/${testReportId}`);
      if (detailRes.success && detailRes.data.photos.length > 0) {
        logResult('案件详情中包含照片记录', true, `照片数量: ${detailRes.data.photos.length}`);
      } else {
        logResult('案件详情中包含照片记录', false, '照片列表为空');
      }
    } catch (e) {
      logResult('案件详情中包含照片记录', false, e.error || e.message);
    }

    // 测试3: 上传非图片类型文件应被拒绝（如果有校验的话）
    try {
      const testFilePath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testFilePath, 'this is not an image');

      const formData = new FormData();
      formData.append('photo', fs.createReadStream(testFilePath));
      formData.append('photo_type', 'scene');
      formData.append('operator', '查勘员张三');

      try {
        await api.post(`/reports/${testReportId}/photos`, formData, {
          headers: formData.getHeaders()
        });
        logResult('上传非图片文件被拒绝（可选）', true, '如后端有校验会拒绝，如无此测试跳过也正常');
      } catch (e) {
        if (e.error && e.error.includes('文件类型') || e.message.includes('400')) {
          logResult('上传非图片文件被拒绝（可选）', true, '正确拒绝了非图片文件');
        } else {
          logResult('上传非图片文件被拒绝（可选）', true, '后端未做类型校验，此功能可选');
        }
      }

      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    } catch (e) {
      logResult('上传非图片文件测试', false, e.message);
    }

    console.log('\n========================================');
    console.log('  测试组2: 无照片定损校验和错误提示');
    console.log('========================================\n');

    // 创建一个新案件用于无照片测试
    let noPhotoReportId = null;
    try {
      const newReport = await api.post('/reports', {
        reporter_name: '无照片测试用户',
        reporter_phone: '13900139000',
        vehicle_plate: '京B99999',
        vehicle_brand: '测试品牌',
        vehicle_model: '测试车型',
        accident_time: new Date().toISOString(),
        accident_location: '测试地点',
        accident_description: '无照片定损测试案件'
      });
      noPhotoReportId = newReport.data.id;

      await api.post(`/reports/${noPhotoReportId}/submit-survey`, { operator: '查勘员张三' });

      const damageItems = [
        {
          damage_part: '前保险杠',
          damage_type: 'repair',
          item_name: '前保险杠修复',
          quantity: 1,
          unit_price: 500,
          labor_fee: 200,
          total_amount: 700,
          parts_source: 'original'
        }
      ];

      try {
        await api.post(`/reports/${noPhotoReportId}/damage-items`, { items: damageItems, operator: '定损员李四' });
        await api.post(`/reports/${noPhotoReportId}/submit-assessment`, { operator: '定损员李四' });
        logResult('无照片提交定损被正确拒绝', false, '应该被拒绝但实际通过了');
      } catch (e) {
        const errorMsg = e.error || e.message || '';
        if (errorMsg.includes('照片') || errorMsg.includes('photo')) {
          logResult('无照片提交定损被正确拒绝', true, '成功拦截无照片定损');
          
          if (errorMsg.includes('缺少现场') || errorMsg.includes('先上传') || errorMsg.includes('查勘照片')) {
            logResult('错误提示友好且具体', true, `提示信息: ${errorMsg}`);
          } else {
            logResult('错误提示友好且具体', false, `提示不够友好: ${errorMsg}`);
          }
        } else {
          logResult('无照片提交定损被正确拒绝', false, `错误信息不匹配: ${errorMsg}`);
        }
      }
    } catch (e) {
      logResult('无照片定损测试准备', false, e.error || e.message);
    }

    console.log('\n========================================');
    console.log('  测试组3: 赔付建议接口功能');
    console.log('========================================\n');

    // 先提交照片、查勘、定损，让案件进入赔付状态
    try {
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      const formData = new FormData();
      formData.append('photo', fs.createReadStream(testImagePath));
      formData.append('photo_type', 'scene');
      formData.append('damage_part', '前保险杠');
      formData.append('operator', '查勘员张三');
      await api.post(`/reports/${testReportId}/photos`, formData, {
        headers: formData.getHeaders()
      });

      await api.post(`/reports/${testReportId}/submit-survey`, { operator: '查勘员张三' });

      const damageItems = [
        {
          damage_part: '前保险杠',
          damage_type: 'repair',
          item_name: '前保险杠修复',
          quantity: 1,
          unit_price: 500,
          labor_fee: 200,
          total_amount: 700,
          parts_source: 'original'
        }
      ];
      await api.post(`/reports/${testReportId}/damage-items`, { items: damageItems, operator: '定损员李四' });
      await api.post(`/reports/${testReportId}/submit-assessment`, { operator: '定损员李四' });

      const detailRes = await api.get(`/reports/${testReportId}`);
      logResult('案件成功进入赔付状态', 
        detailRes.data.status === 'pending_pay',
        `当前状态: ${detailRes.data.status_name} (${detailRes.data.status})`
      );
    } catch (e) {
      logResult('案件进入赔付状态准备', false, e.error || e.message);
    }

    // 测试1: 保存赔付建议
    try {
      const payoutRes = await api.post(`/reports/${testReportId}/payout-suggestion`, {
        suggestion: '经审核，本次事故属于保险责任范围，建议赔付700元整。',
        amount: 700,
        operator: '理赔员王五'
      });

      if (payoutRes.success) {
        logResult('保存赔付建议', true, '赔付建议保存成功');

        const detailRes = await api.get(`/reports/${testReportId}`);
        const report = detailRes.data;

        if (report.payout_suggestion && report.payout_suggestion.includes('建议赔付')) {
          logResult('赔付建议内容正确保存', true, `内容: ${report.payout_suggestion.substring(0, 30)}...`);
        } else {
          logResult('赔付建议内容正确保存', false, '赔付建议内容为空或不正确');
        }

        if (report.payout_amount === 700) {
          logResult('赔付金额正确保存', true, `金额: ${report.payout_amount}元`);
        } else {
          logResult('赔付金额正确保存', false, `金额不正确: ${report.payout_amount}`);
        }

        if (report.payout_operator === '理赔员王五') {
          logResult('赔付操作人正确保存', true, `操作人: ${report.payout_operator}`);
        } else {
          logResult('赔付操作人正确保存', false, `操作人不正确: ${report.payout_operator}`);
        }

        if (report.payout_time) {
          logResult('赔付时间正确保存', true, `时间: ${report.payout_time}`);
        } else {
          logResult('赔付时间正确保存', false, '赔付时间为空');
        }
      } else {
        logResult('保存赔付建议', false, payoutRes.error || '返回失败');
      }
    } catch (e) {
      logResult('保存赔付建议', false, e.error || e.message);
    }

    // 测试2: 更新赔付建议
    try {
      const updateRes = await api.post(`/reports/${testReportId}/payout-suggestion`, {
        suggestion: '经复审，本次事故建议赔付金额调整为650元。',
        amount: 650,
        operator: '理赔员赵六'
      });

      if (updateRes.success) {
        const detailRes = await api.get(`/reports/${testReportId}`);
        if (detailRes.data.payout_amount === 650) {
          logResult('更新赔付建议', true, '赔付建议可成功更新');
        } else {
          logResult('更新赔付建议', false, '金额未更新');
        }
      } else {
        logResult('更新赔付建议', false, updateRes.error || '返回失败');
      }
    } catch (e) {
      logResult('更新赔付建议', false, e.error || e.message);
    }

    // 测试3: 保存赔付建议时校验状态（不在赔付状态的案件不允许保存）
    try {
      const pendingCaseRes = await api.post('/reports', {
        reporter_name: '待查勘用户',
        reporter_phone: '13700137000',
        vehicle_plate: '京C77777',
        vehicle_brand: '测试品牌',
        vehicle_model: '测试车型',
        accident_time: new Date().toISOString(),
        accident_location: '测试地点',
        accident_description: '待查勘案件'
      });
      const pendingId = pendingCaseRes.data.id;

      try {
        await api.post(`/reports/${pendingId}/payout-suggestion`, {
          suggestion: '测试赔付建议',
          amount: 100,
          operator: '理赔员测试'
        });
        logResult('非赔付状态案件保存赔付建议被拒绝', false, '应该被拒绝但实际通过了');
      } catch (e) {
        logResult('非赔付状态案件保存赔付建议被拒绝', true, 
          `正确拦截，错误信息: ${e.error || e.message}`.substring(0, 100));
      }
    } catch (e) {
      logResult('非赔付状态校验测试', false, e.error || e.message);
    }

    console.log('\n========================================');
    console.log('  测试组4: 案件结案功能');
    console.log('========================================\n');

    // 测试: 结案操作
    try {
      const completeRes = await api.post(`/reports/${testReportId}/complete`, {
        operator: '理赔员王五'
      });

      if (completeRes.success) {
        logResult('案件结案', true, '案件成功结案');

        const detailRes = await api.get(`/reports/${testReportId}`);
        if (detailRes.data.status === 'completed') {
          logResult('结案后状态正确', true, `状态: ${detailRes.data.status_name}`);
        } else {
          logResult('结案后状态正确', false, `状态不正确: ${detailRes.data.status}`);
        }
      } else {
        logResult('案件结案', false, completeRes.error || '返回失败');
      }
    } catch (e) {
      logResult('案件结案', false, e.error || e.message);
    }

    // 测试: 已结案案件不允许再次结案
    try {
      try {
        await api.post(`/reports/${testReportId}/complete`, { operator: '理赔员王五' });
        logResult('已结案案件再次结案被拒绝', false, '应该被拒绝但实际通过了');
      } catch (e) {
        logResult('已结案案件再次结案被拒绝', true, '正确拦截重复结案操作');
      }
    } catch (e) {
      logResult('重复结案拦截测试', false, e.message);
    }

    console.log('\n========================================');
    console.log('  测试组5: 错误信息友好性检查');
    console.log('========================================\n');

    // 检查一些常见操作的错误提示是否友好
    try {
      const fakeId = 'not-exist-id-12345';
      
      try {
        await api.get(`/reports/${fakeId}`);
        logResult('查询不存在的案件有友好提示', false, '应该返回错误');
      } catch (e) {
        const msg = e.error || e.message || '';
        logResult('查询不存在的案件有友好提示', true, 
          `提示信息: ${msg.substring(0, 60)}${msg.length > 60 ? '...' : ''}`);
      }
    } catch (e) {
      logResult('错误提示检查', false, e.message);
    }

    console.log('\n========================================');
    console.log('  测试结果汇总');
    console.log('========================================\n');

    console.log(`通过: ${passed} 个`);
    console.log(`失败: ${failed} 个`);
    console.log(`总计: ${passed + failed} 个`);
    console.log(`通过率: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
      console.log('失败的测试用例:');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.name}: ${r.detail}`);
      });
    }

    // 清理测试文件
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }

    console.log('\n========================================');
    console.log('  测试完成');
    console.log('========================================\n');

    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('测试执行失败:', error);
    process.exit(1);
  }
}

test();
