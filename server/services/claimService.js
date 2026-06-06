const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const STATUS = {
  PENDING_SURVEY: 'pending_survey',
  SURVEYING: 'surveying',
  PENDING_ASSESS: 'pending_assess',
  ASSESSING: 'assessing',
  PENDING_REVIEW: 'pending_review',
  REVIEWING: 'reviewing',
  REVIEW_REJECTED: 'review_rejected',
  PENDING_PAY: 'pending_pay',
  COMPLETED: 'completed',
  CLOSED: 'closed'
};

const STATUS_NAMES = {
  [STATUS.PENDING_SURVEY]: '待查勘',
  [STATUS.SURVEYING]: '查勘中',
  [STATUS.PENDING_ASSESS]: '待定损',
  [STATUS.ASSESSING]: '定损中',
  [STATUS.PENDING_REVIEW]: '待复核',
  [STATUS.REVIEWING]: '复核中',
  [STATUS.REVIEW_REJECTED]: '复核退回',
  [STATUS.PENDING_PAY]: '待赔付',
  [STATUS.COMPLETED]: '已完成',
  [STATUS.CLOSED]: '已结案'
};

function generateReportNo() {
  const date = dayjs().format('YYYYMMDD');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BA${date}${random}`;
}

function addStatusHistory(reportId, fromStatus, toStatus, operator, remark = '') {
  const stmt = db.prepare(`
    INSERT INTO status_history (id, report_id, from_status, to_status, operator, operation_time, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(uuidv4(), reportId, fromStatus, toStatus, operator, dayjs().format(), remark);
}

function updateReportStatus(reportId, newStatus, operator, remark = '') {
  const report = db.prepare('SELECT status FROM report WHERE id = ?').get(reportId);
  if (!report) throw new Error('案件不存在');
  
  const stmt = db.prepare(`
    UPDATE report SET status = ?, updated_at = ? WHERE id = ?
  `);
  stmt.run(newStatus, dayjs().format(), reportId);
  
  addStatusHistory(reportId, report.status, newStatus, operator, remark);
}

function createReport(data) {
  const id = uuidv4();
  const reportNo = generateReportNo();
  const now = dayjs().format();
  
  const stmt = db.prepare(`
    INSERT INTO report (
      id, report_no, reporter_name, reporter_phone, accident_time,
      accident_location, accident_description, vehicle_plate,
      vehicle_brand, vehicle_model, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id, reportNo, data.reporter_name, data.reporter_phone,
    data.accident_time, data.accident_location,
    data.accident_description, data.vehicle_plate,
    data.vehicle_brand, data.vehicle_model,
    STATUS.PENDING_SURVEY, now, now
  );
  
  addStatusHistory(id, null, STATUS.PENDING_SURVEY, data.reporter_name, '报案登记');
  
  return getReportById(id);
}

function getReportById(id) {
  const report = db.prepare('SELECT * FROM report WHERE id = ?').get(id);
  if (!report) return null;
  
  const photos = db.prepare('SELECT * FROM photo WHERE report_id = ? ORDER BY upload_time').all(id);
  const damageItems = db.prepare('SELECT * FROM damage_item WHERE report_id = ? ORDER BY assess_time').all(id);
  const reviews = db.prepare('SELECT * FROM review WHERE report_id = ? ORDER BY created_at').all(id);
  const history = db.prepare('SELECT * FROM status_history WHERE report_id = ? ORDER BY operation_time').all(id);
  
  return {
    ...report,
    status_name: STATUS_NAMES[report.status],
    photos,
    damage_items: damageItems,
    reviews,
    status_history: history.map(h => ({
      ...h,
      from_status_name: h.from_status ? STATUS_NAMES[h.from_status] : null,
      to_status_name: STATUS_NAMES[h.to_status]
    })),
    total_amount: damageItems.reduce((sum, item) => sum + item.total_amount, 0)
  };
}

function listReports(params = {}) {
  let sql = 'SELECT * FROM report WHERE 1=1';
  const conditions = [];
  
  if (params.status) {
    sql += ' AND status = ?';
    conditions.push(params.status);
  }
  
  if (params.keyword) {
    sql += ' AND (report_no LIKE ? OR reporter_name LIKE ? OR vehicle_plate LIKE ?)';
    const kw = `%${params.keyword}%`;
    conditions.push(kw, kw, kw);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  if (params.limit) {
    sql += ' LIMIT ?';
    conditions.push(params.limit);
  }
  
  const reports = db.prepare(sql).all(...conditions);
  
  return reports.map(r => ({
    ...r,
    status_name: STATUS_NAMES[r.status]
  }));
}

function uploadPhoto(reportId, data) {
  const report = db.prepare('SELECT status FROM report WHERE id = ?').get(reportId);
  if (!report) throw new Error('案件不存在');
  
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO photo (
      id, report_id, photo_type, damage_part, file_name,
      file_path, upload_by, upload_time, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id, reportId, data.photo_type, data.damage_part || null,
    data.file_name, data.file_path, data.upload_by,
    dayjs().format(), data.description || null
  );
  
  if (report.status === STATUS.PENDING_SURVEY) {
    updateReportStatus(reportId, STATUS.SURVEYING, data.upload_by, '开始查勘');
  }
  
  return db.prepare('SELECT * FROM photo WHERE id = ?').get(id);
}

function getPhotos(reportId) {
  return db.prepare('SELECT * FROM photo WHERE report_id = ? ORDER BY upload_time').all(reportId);
}

function submitSurvey(reportId, operator) {
  const report = db.prepare('SELECT status FROM report WHERE id = ?').get(reportId);
  if (!report) throw new Error('案件不存在');
  if (report.status !== STATUS.SURVEYING) {
    throw new Error('当前状态不允许提交查勘');
  }
  
  const photos = db.prepare('SELECT COUNT(*) as count FROM photo WHERE report_id = ?').get(reportId);
  if (photos.count === 0) {
    throw new Error('缺少现场照片，无法提交查勘');
  }
  
  updateReportStatus(reportId, STATUS.PENDING_ASSESS, operator, '查勘完成');
  
  return getReportById(reportId);
}

function validateDamageItems(reportId, items, isReSubmit = false) {
  const report = db.prepare('SELECT status FROM report WHERE id = ?').get(reportId);
  if (!report) throw new Error('案件不存在');
  
  const validStatuses = [STATUS.PENDING_ASSESS, STATUS.ASSESSING, STATUS.REVIEW_REJECTED];
  if (!validStatuses.includes(report.status)) {
    throw new Error('当前状态不允许定损');
  }
  
  if (isReSubmit) {
    const hasAdjustmentNote = items.every(item => item.adjustment_note && item.adjustment_note.trim().length > 0);
    if (!hasAdjustmentNote) {
      throw new Error('复核退回后再次提交，所有损失项目必须填写调整说明');
    }
  }
  
  const parts = items.map(item => item.damage_part);
  const uniqueParts = [...new Set(parts)];
  if (parts.length !== uniqueParts.length) {
    throw new Error('同一损失部位不能重复计价');
  }
  
  const photos = db.prepare('SELECT COUNT(*) as count FROM photo WHERE report_id = ?').get(reportId);
  if (photos.count === 0) {
    throw new Error('缺少现场照片，无法提交定损');
  }
  
  return true;
}

function saveDamageItems(reportId, items, operator) {
  const report = db.prepare('SELECT status FROM report WHERE id = ?').get(reportId);
  if (!report) throw new Error('案件不存在');
  
  const isReSubmit = report.status === STATUS.REVIEW_REJECTED;
  
  validateDamageItems(reportId, items, isReSubmit);
  
  db.prepare('DELETE FROM damage_item WHERE report_id = ?').run(reportId);
  
  const insertSql = `
    INSERT INTO damage_item (
      id, report_id, damage_part, damage_type, item_name,
      quantity, unit_price, labor_fee, total_amount,
      parts_source, assessor, assess_time, adjustment_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  for (const item of items) {
    const totalAmount = (item.quantity * item.unit_price) + (item.labor_fee || 0);
    db.prepare(insertSql).run(
      uuidv4(), reportId, item.damage_part, item.damage_type,
      item.item_name, item.quantity, item.unit_price,
      item.labor_fee || 0, totalAmount,
      item.parts_source, operator, dayjs().format(),
      isReSubmit ? item.adjustment_note : null
    );
  }
  
  if (report.status === STATUS.PENDING_ASSESS || report.status === STATUS.REVIEW_REJECTED) {
    updateReportStatus(reportId, STATUS.ASSESSING, operator, '定损录入中');
  }
  
  return getReportById(reportId);
}

function submitAssessment(reportId, operator) {
  const report = getReportById(reportId);
  if (!report) throw new Error('案件不存在');
  if (report.status !== STATUS.ASSESSING) {
    throw new Error('当前状态不允许提交定损');
  }
  
  if (report.damage_items.length === 0) {
    throw new Error('请先录入损失项目');
  }
  
  const threshold = db.prepare('SELECT max_amount FROM threshold_config WHERE role = ?').get('surveyor');
  const totalAmount = report.total_amount;
  
  if (totalAmount > threshold.max_amount) {
    const reviewStmt = db.prepare(`
      INSERT INTO review (id, report_id, total_amount, threshold, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    reviewStmt.run(uuidv4(), reportId, totalAmount, threshold.max_amount, dayjs().format());
    
    updateReportStatus(reportId, STATUS.PENDING_REVIEW, operator, 
      `定损金额${totalAmount}元超过权限${threshold.max_amount}元，进入复核流程`);
  } else {
    updateReportStatus(reportId, STATUS.PENDING_PAY, operator, '定损完成，进入赔付流程');
  }
  
  return getReportById(reportId);
}

function getReviewQueue() {
  const reports = db.prepare(`
    SELECT r.* FROM report r
    WHERE r.status IN (?, ?)
    ORDER BY r.updated_at DESC
  `).all(STATUS.PENDING_REVIEW, STATUS.REVIEWING);
  
  return reports.map(r => {
    const review = db.prepare('SELECT * FROM review WHERE report_id = ? ORDER BY created_at DESC').get(r.id);
    return {
      ...r,
      status_name: STATUS_NAMES[r.status],
      current_review: review
    };
  });
}

function startReview(reportId, reviewer) {
  const report = db.prepare('SELECT status FROM report WHERE id = ?').get(reportId);
  if (!report) throw new Error('案件不存在');
  if (report.status !== STATUS.PENDING_REVIEW) {
    throw new Error('当前状态不允许复核');
  }
  
  updateReportStatus(reportId, STATUS.REVIEWING, reviewer, '开始复核');
  return getReportById(reportId);
}

function processReview(reportId, reviewer, result, opinion) {
  const report = getReportById(reportId);
  if (!report) throw new Error('案件不存在');
  if (report.status !== STATUS.REVIEWING) {
    throw new Error('当前状态不允许处理复核');
  }
  
  const review = db.prepare('SELECT * FROM review WHERE report_id = ? ORDER BY created_at DESC').get(reportId);
  if (!review) throw new Error('复核记录不存在');
  
  db.prepare(`
    UPDATE review 
    SET reviewer = ?, review_opinion = ?, review_result = ?, review_time = ?
    WHERE id = ?
  `).run(reviewer, opinion, result, dayjs().format(), review.id);
  
  if (result === 'approve') {
    updateReportStatus(reportId, STATUS.PENDING_PAY, reviewer, `复核通过，意见：${opinion}`);
  } else if (result === 'reject') {
    updateReportStatus(reportId, STATUS.REVIEW_REJECTED, reviewer, `复核退回，意见：${opinion}`);
  }
  
  return getReportById(reportId);
}

function getThresholdConfig() {
  return db.prepare('SELECT * FROM threshold_config').all();
}

function getStatusList() {
  return Object.entries(STATUS_NAMES).map(([code, name]) => ({ code, name }));
}

module.exports = {
  STATUS,
  STATUS_NAMES,
  createReport,
  getReportById,
  listReports,
  uploadPhoto,
  getPhotos,
  submitSurvey,
  saveDamageItems,
  submitAssessment,
  getReviewQueue,
  startReview,
  processReview,
  getThresholdConfig,
  getStatusList
};
