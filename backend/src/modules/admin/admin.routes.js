import path from 'path';
import fs from 'fs';
import express from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { parse as parseCsv } from 'csv-parse/sync';
import xlsx from 'xlsx';
import { db } from '../../config/db.js';
import { env } from '../../config/env.js';
import { auth } from '../../middleware/auth.js';
import { signToken } from '../../utils/jwt.js';
import { generateRandomPassword } from '../../utils/password.js';
import { decryptText, encryptText } from '../../utils/crypto.js';
import { convertPdfToImages } from '../../utils/pdfConvert.js';

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(env.storageRoot, 'imports'));
    },
    filename: (req, file, cb) => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      cb(null, `${suffix}-${file.originalname.replace(/\s+/g, '_')}`);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
});

router.post('/login', (req, res) => {
  const rawUsername = req.body?.username ?? req.body?.student_id;
  const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';
  const password = req.body?.password;
  if (!username || !password) {
    return res.status(400).json({ message: 'username(student_id) and password are required' });
  }

  const admin = db
    .prepare('SELECT id, username, password_hash FROM admins WHERE username = ?')
    .get(username);

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken({ role: 'admin', adminId: admin.id, username: admin.username });
  return res.json({ token, admin: { id: admin.id, username: admin.username } });
});

router.get('/documents', auth('admin'), (req, res) => {
  const docs = db
    .prepare(
      `SELECT id, title, original_filename, status, total_pages, created_at
       FROM documents
       ORDER BY id DESC`
    )
    .all();
  res.json({ list: docs });
});

router.post('/documents', auth('admin'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required' });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Only PDF is allowed' });
    }

    const title = (req.body?.title || path.basename(req.file.originalname, ext)).trim();

    const insertDoc = db.prepare(
      `INSERT INTO documents (title, original_filename, pdf_path, status, total_pages, uploaded_by_admin_id)
       VALUES (?, ?, ?, 'processing', 0, ?)`
    );

    const info = insertDoc.run(title || 'Untitled', req.file.originalname, '', req.auth.adminId);
    const documentId = Number(info.lastInsertRowid);

    const pdfDir = path.join(env.storageRoot, 'pdfs', String(documentId));
    const pagesDir = path.join(env.storageRoot, 'pages', String(documentId));
    fs.mkdirSync(pdfDir, { recursive: true });
    const finalPdfPath = path.join(pdfDir, 'source.pdf');

    fs.renameSync(req.file.path, finalPdfPath);

    db.prepare('UPDATE documents SET pdf_path = ? WHERE id = ?').run(finalPdfPath, documentId);

    setImmediate(async () => {
      try {
        await convertPdfToImages(documentId, finalPdfPath, pagesDir);
      } catch (error) {
        console.error('Convert failed:', error.message);
      }
    });

    return res.status(201).json({ id: documentId, title, status: 'processing' });
  } catch (error) {
    return next(error);
  }
});

function pickValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

function parseImportFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return parseCsv(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  }
  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = xlsx.readFile(filePath);
    const firstSheet = workbook.SheetNames[0];
    return xlsx.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
  }
  throw new Error('Only CSV/XLSX/XLS is supported');
}

router.post('/users/import', auth('admin'), upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Import file is required' });
    }

    const rows = parseImportFile(req.file.path);
    const insertUser = db.prepare(
      'INSERT INTO users (name, student_id, password_hash) VALUES (?, ?, ?)'
    );
    const insertInitialPassword = db.prepare(
      `INSERT INTO user_initial_passwords (user_id, ciphertext, iv, auth_tag)
       VALUES (?, ?, ?, ?)`
    );

    const result = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: [],
      generated: [],
    };

    rows.forEach((row, index) => {
      const name = pickValue(row, ['name', 'Name', '姓名']);
      const studentId = pickValue(row, ['student_id', 'studentId', '学号']);

      if (!name || !studentId) {
        result.failed += 1;
        result.errors.push({ row: index + 2, reason: 'name or student_id missing' });
        return;
      }

      const exists = db.prepare('SELECT id FROM users WHERE student_id = ?').get(studentId);
      if (exists) {
        result.failed += 1;
        result.errors.push({ row: index + 2, reason: `student_id exists: ${studentId}` });
        return;
      }

      const plain = generateRandomPassword(10);
      const hash = bcrypt.hashSync(plain, 10);
      const encrypted = encryptText(plain);

      const tx = db.transaction(() => {
        const inserted = insertUser.run(name, studentId, hash);
        const userId = Number(inserted.lastInsertRowid);
        insertInitialPassword.run(userId, encrypted.ciphertext, encrypted.iv, encrypted.authTag);
      });

      tx();
      result.success += 1;
      result.generated.push({ name, student_id: studentId, password: plain });
    });

    fs.unlinkSync(req.file.path);
    return res.json(result);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return next(error);
  }
});

function csvEscape(text) {
  const s = String(text ?? '');
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

router.get('/users/export', auth('admin'), (req, res, next) => {
  try {
    const rows = db
      .prepare(
        `SELECT u.id, u.name, u.student_id,
                p.ciphertext AS ciphertext, p.iv AS iv, p.auth_tag AS auth_tag
         FROM users u
         LEFT JOIN user_initial_passwords p ON p.user_id = u.id
         ORDER BY u.id ASC`
      )
      .all();

    const header = 'name,student_id,initial_password';
    const lines = rows.map((row) => {
      let password = '';
      if (row.ciphertext && row.iv && row.auth_tag) {
        password = decryptText({
          ciphertext: row.ciphertext,
          iv: row.iv,
          authTag: row.auth_tag,
        });
      }
      return [csvEscape(row.name), csvEscape(row.student_id), csvEscape(password)].join(',');
    });

    db.prepare("UPDATE user_initial_passwords SET last_exported_at = datetime('now')").run();

    const content = [header, ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
    return res.send(content);
  } catch (error) {
    return next(error);
  }
});

router.get('/users', auth('admin'), (req, res) => {
  const list = db
    .prepare(
      `SELECT id, name, student_id, created_at, last_login_at
       FROM users
       ORDER BY id DESC`
    )
    .all();
  res.json({ list });
});

export default router;
