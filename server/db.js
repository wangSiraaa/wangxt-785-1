const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'insurance.db');

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  let dbData = null;
  if (fs.existsSync(dbPath)) {
    dbData = fs.readFileSync(dbPath);
  }
  
  db = new SQL.Database(dbData);
  
  db.run(`
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
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS photo (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      photo_type TEXT NOT NULL,
      damage_part TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      description TEXT,
      upload_by TEXT NOT NULL,
      upload_time TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES report(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS damage_item (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      damage_part TEXT NOT NULL,
      damage_type TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      labor_fee REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      parts_source TEXT NOT NULL,
      assessor TEXT NOT NULL,
      assess_time TEXT NOT NULL,
      adjustment_note TEXT,
      FOREIGN KEY (report_id) REFERENCES report(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS review (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      threshold REAL NOT NULL,
      reviewer TEXT,
      review_opinion TEXT,
      review_result TEXT,
      review_time TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES report(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS status_history (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      operator TEXT NOT NULL,
      operation_time TEXT NOT NULL,
      remark TEXT,
      FOREIGN KEY (report_id) REFERENCES report(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS threshold_config (
      id TEXT PRIMARY KEY,
      role TEXT UNIQUE NOT NULL,
      max_amount REAL NOT NULL,
      description TEXT
    );
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_report_status ON report(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_photo_report ON photo(report_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_damage_report ON damage_item(report_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_review_report ON review(report_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_history_report ON status_history(report_id)`);

  const thresholdResult = db.exec('SELECT COUNT(*) as count FROM threshold_config');
  const thresholdCount = thresholdResult.length > 0 ? thresholdResult[0].values[0][0] : 0;
  
  if (thresholdCount === 0) {
    db.run(`
      INSERT INTO threshold_config (id, role, max_amount, description)
      VALUES ('th_001', 'surveyor', 5000, '查勘员定损权限')
    `);
    db.run(`
      INSERT INTO threshold_config (id, role, max_amount, description)
      VALUES ('th_002', 'senior_surveyor', 20000, '高级定损员定损权限')
    `);
    db.run(`
      INSERT INTO threshold_config (id, role, max_amount, description)
      VALUES ('th_003', 'manager', 100000, '经理审批权限')
    `);
  }

  saveDatabase();
  console.log('数据库初始化完成');
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function prepare(sql) {
  const stmt = db.prepare(sql);
  
  return {
    run: function(...params) {
      if (params.length > 0) {
        stmt.bind(params);
      }
      stmt.step();
      stmt.reset();
      saveDatabase();
      return { 
        changes: db.getRowsModified(),
        lastInsertRowid: null
      };
    },
    get: function(...params) {
      if (params.length > 0) {
        stmt.bind(params);
      }
      const result = [];
      while (stmt.step()) {
        result.push(stmt.getAsObject());
      }
      stmt.reset();
      return result.length > 0 ? result[0] : undefined;
    },
    all: function(...params) {
      if (params.length > 0) {
        stmt.bind(params);
      }
      const result = [];
      while (stmt.step()) {
        result.push(stmt.getAsObject());
      }
      stmt.reset();
      return result;
    }
  };
}

function exec(sql) {
  const results = db.exec(sql);
  saveDatabase();
  return results;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

function getDb() {
  return db;
}

module.exports = {
  initDatabase,
  prepare,
  exec,
  run,
  getDb,
  saveDatabase
};
