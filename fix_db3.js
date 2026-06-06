const fs = require('fs');

const filePath = '/Users/mingyuan/workspace/sihuo/wangxtw3/785/server/db.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== 查找 report 表结构 ===');
const reportMatch = content.match(/CREATE TABLE IF NOT EXISTS report \([\s\S]*?\);/);
if (reportMatch) {
  console.log('找到 report 表:');
  console.log(reportMatch[0].substring(0, 500));
  console.log('---');
  
  // 在 status 后面添加赔付字段
  const newReportTable = reportMatch[0].replace(
    "status TEXT NOT NULL DEFAULT 'pending_survey',",
    "status TEXT NOT NULL DEFAULT 'pending_survey',\n      payout_suggestion TEXT,\n      payout_amount REAL,\n      payout_operator TEXT,\n      payout_time TEXT,"
  );
  content = content.replace(reportMatch[0], newReportTable);
  console.log('✅ report 表修改完成');
}

console.log('\n=== 查找 photo 表结构 ===');
const photoMatch = content.match(/CREATE TABLE IF NOT EXISTS photo \([\s\S]*?\);/);
if (photoMatch) {
  console.log('找到 photo 表:');
  console.log(photoMatch[0].substring(0, 400));
  console.log('---');
  
  // 在 file_path 后面添加文件字段
  const newPhotoTable = photoMatch[0].replace(
    "file_path TEXT NOT NULL,",
    "file_path TEXT NOT NULL,\n      file_size INTEGER,\n      mime_type TEXT,"
  );
  content = content.replace(photoMatch[0], newPhotoTable);
  console.log('✅ photo 表修改完成');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ 所有修改已保存');
