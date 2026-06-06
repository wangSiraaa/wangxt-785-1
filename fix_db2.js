const fs = require('fs');

const filePath = '/Users/mingyuan/workspace/sihuo/wangxtw3/785/server/db.js';
let content = fs.readFileSync(filePath, 'utf8');

// 修改 report 表
const oldReport = "      status TEXT NOT NULL DEFAULT 'pending_survey',\n      created_at TEXT NOT NULL,\n      updated_at TEXT NOT NULL";
const newReport = "      status TEXT NOT NULL DEFAULT 'pending_survey',\n      payout_suggestion TEXT,\n      payout_amount REAL,\n      payout_operator TEXT,\n      payout_time TEXT,\n      created_at TEXT NOT NULL,\n      updated_at TEXT NOT NULL";

if (content.includes(oldReport)) {
  content = content.replace(oldReport, newReport);
  console.log('✅ report 表添加赔付字段成功');
} else {
  console.log('⚠️  未找到匹配的 report 表结构');
}

// 修改 photo 表
const oldPhoto = "      file_path TEXT NOT NULL,\n      upload_by TEXT NOT NULL,\n      upload_time TEXT NOT NULL,\n      description TEXT,";
const newPhoto = "      file_path TEXT NOT NULL,\n      file_size INTEGER,\n      mime_type TEXT,\n      upload_by TEXT NOT NULL,\n      upload_time TEXT NOT NULL,\n      description TEXT,";

if (content.includes(oldPhoto)) {
  content = content.replace(oldPhoto, newPhoto);
  console.log('✅ photo 表添加文件字段成功');
} else {
  console.log('⚠️  未找到匹配的 photo 表结构');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ db.js 修改完成');
