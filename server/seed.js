const { initDatabase, prepare } = require('./db');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

async function runSeed() {
  await initDatabase();
  
  console.log('开始插入种子数据...');

  const now = dayjs().format();

  const reports = [
    {
      id: uuidv4(),
      report_no: 'BA202401010001',
      reporter_name: '张三',
      reporter_phone: '13800138001',
      accident_time: dayjs().subtract(1, 'hour').format(),
      accident_location: '北京市朝阳区建国路88号',
      accident_description: '追尾事故，前车后保险杠受损',
      vehicle_plate: '京A12345',
      vehicle_brand: '大众',
      vehicle_model: '迈腾2023款',
      status: 'pending_survey',
      created_at: now,
      updated_at: now
    },
    {
      id: uuidv4(),
      report_no: 'BA202401010002',
      reporter_name: '李四',
      reporter_phone: '13800138002',
      accident_time: dayjs().subtract(2, 'hour').format(),
      accident_location: '北京市海淀区中关村大街1号',
      accident_description: '变道刮擦，左前门和左后视镜受损',
      vehicle_plate: '京B67890',
      vehicle_brand: '丰田',
      vehicle_model: '凯美瑞2022款',
      status: 'surveying',
      created_at: dayjs().subtract(2, 'hour').format(),
      updated_at: now
    },
    {
      id: uuidv4(),
      report_no: 'BA202401010003',
      reporter_name: '王五',
      reporter_phone: '13800138003',
      accident_time: dayjs().subtract(3, 'hour').format(),
      accident_location: '北京市西城区金融街15号',
      accident_description: '倒车撞到立柱，后保险杠和尾灯受损',
      vehicle_plate: '京C11111',
      vehicle_brand: '本田',
      vehicle_model: '雅阁2023款',
      status: 'pending_assess',
      created_at: dayjs().subtract(3, 'hour').format(),
      updated_at: now
    },
    {
      id: uuidv4(),
      report_no: 'BA202401010004',
      reporter_name: '赵六',
      reporter_phone: '13800138004',
      accident_time: dayjs().subtract(5, 'hour').format(),
      accident_location: '北京市东城区王府井大街201号',
      accident_description: '暴雨天气车辆被淹，发动机和电器系统受损',
      vehicle_plate: '京D22222',
      vehicle_brand: '奥迪',
      vehicle_model: 'A6L 2023款',
      status: 'pending_review',
      created_at: dayjs().subtract(5, 'hour').format(),
      updated_at: now
    }
  ];

  const insertReport = prepare(`
    INSERT OR IGNORE INTO report (
      id, report_no, reporter_name, reporter_phone, accident_time,
      accident_location, accident_description, vehicle_plate,
      vehicle_brand, vehicle_model, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  reports.forEach(r => {
    insertReport.run(
      r.id, r.report_no, r.reporter_name, r.reporter_phone,
      r.accident_time, r.accident_location, r.accident_description,
      r.vehicle_plate, r.vehicle_brand, r.vehicle_model,
      r.status, r.created_at, r.updated_at
    );
    console.log(`  - 插入报案: ${r.report_no}`);
  });

  const photos = [
    {
      report_id: reports[1].id,
      photo_type: 'scene',
      damage_part: '现场全景',
      file_name: '现场全景1.jpg',
      file_path: '/uploads/scene1.jpg',
      upload_by: '查勘员张三',
      upload_time: now,
      description: '事故现场全景照片'
    },
    {
      report_id: reports[1].id,
      photo_type: 'damage',
      damage_part: '左前门',
      file_name: '左前门刮擦.jpg',
      file_path: '/uploads/damage1.jpg',
      upload_by: '查勘员张三',
      upload_time: now,
      description: '左前门刮擦痕迹'
    },
    {
      report_id: reports[2].id,
      photo_type: 'scene',
      damage_part: '现场全景',
      file_name: '现场照片.jpg',
      file_path: '/uploads/scene2.jpg',
      upload_by: '查勘员李四',
      upload_time: dayjs().subtract(1, 'hour').format(),
      description: '倒车事故现场'
    },
    {
      report_id: reports[2].id,
      photo_type: 'damage',
      damage_part: '后保险杠',
      file_name: '后保险杠凹陷.jpg',
      file_path: '/uploads/damage2.jpg',
      upload_by: '查勘员李四',
      upload_time: dayjs().subtract(1, 'hour').format(),
      description: '后保险杠凹陷变形'
    }
  ];

  const insertPhoto = prepare(`
    INSERT OR IGNORE INTO photo (
      id, report_id, photo_type, damage_part, file_name,
      file_path, upload_by, upload_time, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  photos.forEach(p => {
    insertPhoto.run(
      uuidv4(), p.report_id, p.photo_type, p.damage_part,
      p.file_name, p.file_path, p.upload_by, p.upload_time, p.description
    );
    console.log(`  - 插入照片: ${p.file_name}`);
  });

  const damageItems = [
    {
      report_id: reports[3].id,
      damage_part: '发动机',
      damage_type: 'repair',
      item_name: '发动机进水维修',
      quantity: 1,
      unit_price: 15000,
      labor_fee: 5000,
      total_amount: 20000,
      parts_source: 'original',
      assessor: '定损员李四',
      assess_time: dayjs().subtract(1, 'hour').format()
    },
    {
      report_id: reports[3].id,
      damage_part: '电器系统',
      damage_type: 'replace',
      item_name: '行车电脑更换',
      quantity: 1,
      unit_price: 8000,
      labor_fee: 2000,
      total_amount: 10000,
      parts_source: 'original',
      assessor: '定损员李四',
      assess_time: dayjs().subtract(1, 'hour').format()
    },
    {
      report_id: reports[3].id,
      damage_part: '内饰',
      damage_type: 'repair',
      item_name: '内饰清洁烘干',
      quantity: 1,
      unit_price: 3000,
      labor_fee: 1000,
      total_amount: 4000,
      parts_source: 'repair',
      assessor: '定损员李四',
      assess_time: dayjs().subtract(1, 'hour').format()
    }
  ];

  const insertDamage = prepare(`
    INSERT OR IGNORE INTO damage_item (
      id, report_id, damage_part, damage_type, item_name,
      quantity, unit_price, labor_fee, total_amount,
      parts_source, assessor, assess_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  damageItems.forEach(d => {
    insertDamage.run(
      uuidv4(), d.report_id, d.damage_part, d.damage_type,
      d.item_name, d.quantity, d.unit_price, d.labor_fee,
      d.total_amount, d.parts_source, d.assessor, d.assess_time
    );
    console.log(`  - 插入损失项目: ${d.item_name}`);
  });

  const review = {
    id: uuidv4(),
    report_id: reports[3].id,
    total_amount: 34000,
    threshold: 5000,
    created_at: now
  };

  prepare(`
    INSERT OR IGNORE INTO review (
      id, report_id, total_amount, threshold, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(review.id, review.report_id, review.total_amount, review.threshold, review.created_at);
  console.log(`  - 插入复核记录: ${review.total_amount}元`);

  const insertHistory = prepare(`
    INSERT OR IGNORE INTO status_history (
      id, report_id, from_status, to_status, operator, operation_time, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  reports.forEach(r => {
    insertHistory.run(
      uuidv4(), r.id, null, 'pending_survey',
      r.reporter_name, r.created_at, '报案登记'
    );
    
    if (r.status !== 'pending_survey') {
      insertHistory.run(
        uuidv4(), r.id, 'pending_survey', 'surveying',
        '查勘员张三', r.updated_at, '开始查勘'
      );
    }
    
    if (['pending_assess', 'assessing', 'pending_review', 'review_rejected'].includes(r.status)) {
      insertHistory.run(
        uuidv4(), r.id, 'surveying', 'pending_assess',
        '查勘员张三', r.updated_at, '查勘完成'
      );
    }
    
    if (['assessing', 'pending_review', 'review_rejected'].includes(r.status)) {
      insertHistory.run(
        uuidv4(), r.id, 'pending_assess', 'assessing',
        '定损员李四', r.updated_at, '开始定损'
      );
    }
    
    if (['pending_review', 'review_rejected'].includes(r.status)) {
      insertHistory.run(
        uuidv4(), r.id, 'assessing', 'pending_review',
        '定损员李四', r.updated_at,
        `定损金额${review.total_amount}元超过权限，进入复核`
      );
    }
  });

  console.log('\n种子数据插入完成！');
  console.log(`  报案单: ${reports.length} 条`);
  console.log(`  照片记录: ${photos.length} 条`);
  console.log(`  损失明细: ${damageItems.length} 条`);
  console.log(`  复核记录: 1 条`);
  console.log(`  状态历史: 已自动生成`);
}

runSeed().catch(e => {
  console.error('种子数据插入失败:', e);
  process.exit(1);
});
