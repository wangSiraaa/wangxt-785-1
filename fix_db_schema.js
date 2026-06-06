const fs = require('fs');

const filePath = '/Users/mingyuan/workspace/sihuo/wangxtw3/785/server/db.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. 为 report 表添加赔付建议字段
const oldTable = `  db.run(\`
    CREATE TABLE IF NOT EXISTS report (
      id TEXT PRIMARY KEY,
      report_no TEXT UNIQUE NOT NULL,
      reporter_name TEXT NOT NULL,
      reporter_phone TEXT NOT NULL,
      accident_time TEXT NOT NULL,
      accident_location TEXT NOT NULL,
      accident_description TEXT NOT NULL,
      vehicle_plate TEXT NOT NULL,
      vehicle_brand TEXT NOT NULL,
      vehicle_model TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_survey',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  \`);`;

const newTable = `  db.run(\`
    CREATE TABLE IF NOT EXISTS report (
      id TEXT PRIMARY KEY,
      report_no TEXT UNIQUE NOT NULL,
      reporter_name TEXT NOT NULL,
      reporter_phone TEXT NOT NULL,
      accident_time TEXT NOT NULL,
      accident_location TEXT NOT NULL,
      accident_description TEXT NOT NULL,
      vehicle_plate TEXT NOT NULL,
      vehicle_brand TEXT NOT NULL,
      vehicle_model TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_survey',
      payout_suggestion TEXT,
      payout_amount REAL,
      payout_operator TEXT,
      payout_time TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  \`);`;

if (content.includes(oldTable)) {
  content = content.replace(oldTable, newTable);
  console.log('✅ report 表添加赔付建议字段成功');
} else {
  console.log('⚠️  未找到 report 表定义，可能已修改过');
}

// 2. 为 photo 表添加 file_size, mime_type 字段
const oldPhoto = `  db.run(\`
    CREATE TABLE IF NOT EXISTS photo (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      photo_type TEXT NOT NULL,
      damage_part TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      upload_by TEXT NOT NULL,
      upload_time TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (report_id) REFERENCES report(id) ON DELETE CASCADE
    );
  \`);`;

const newPhoto = `  db.run(\`
    CREATE TABLE IF NOT EXISTS photo (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      photo_type TEXT NOT NULL,
      damage_part TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      upload_by TEXT NOT NULL,
      upload_time TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (report_id) REFERENCES report(id) ON DELETE CASCADE
    );
  \`);`;

if (content.includes(oldPhoto)) {
  content = content.replace(oldPhoto, newPhoto);
  console.log('✅ photo 表添加文件字段成功');
} else {
  console.log('⚠️  未找到 photo 表定义');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ db.js 修改完成');
