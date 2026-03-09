import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { db } from '../config/db.js';
import { rootDir } from '../config/env.js';

const schemaPath = path.join(rootDir, 'src', 'db', 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schemaSql);

const cliUsername = process.argv[2];
const cliPassword = process.argv[3];

const username = cliUsername || process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const password = cliPassword || process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';

if (!username || !password) {
  console.error('Usage: npm run reset-admin -- <username> <password>');
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(password, 10);
const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);

if (existing) {
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(passwordHash, existing.id);
  console.log(`Admin password updated: ${username}`);
} else {
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
  console.log(`Admin created: ${username}`);
}
