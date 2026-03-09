import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { rootDir } from '../config/env.js';
import { DEFAULT_NOTICE_HTML, NOTICE_SETTING_KEY } from '../constants/notice.js';

const schemaPath = path.join(rootDir, 'src', 'db', 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

db.exec(schemaSql);

const defaultAdminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';
const forceResetAdminPassword = process.env.FORCE_RESET_ADMIN_PASSWORD === 'true';
const autoSyncDefaultAdminPassword =
  process.env.AUTO_SYNC_DEFAULT_ADMIN_PASSWORD === 'true' ||
  (process.env.AUTO_SYNC_DEFAULT_ADMIN_PASSWORD !== 'false' &&
    (process.env.NODE_ENV || 'development') !== 'production');

const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(defaultAdminUsername);
if (!existing) {
  const hash = bcrypt.hashSync(defaultAdminPassword, 10);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(defaultAdminUsername, hash);
  console.log(`Default admin created: ${defaultAdminUsername}`);
} else if (forceResetAdminPassword) {
  const hash = bcrypt.hashSync(defaultAdminPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, existing.id);
  console.log(`Default admin password reset: ${defaultAdminUsername}`);
} else if (autoSyncDefaultAdminPassword) {
  const hash = bcrypt.hashSync(defaultAdminPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, existing.id);
  console.log(`Default admin password synced: ${defaultAdminUsername}`);
} else {
  console.log('Default admin already exists');
}

console.log('Database initialized:', process.env.DB_PATH || path.join(rootDir, 'data', 'app.db'));

db.prepare(
  `INSERT OR IGNORE INTO system_settings (key, value, updated_at)
   VALUES (?, ?, datetime('now'))`
).run(NOTICE_SETTING_KEY, DEFAULT_NOTICE_HTML);
