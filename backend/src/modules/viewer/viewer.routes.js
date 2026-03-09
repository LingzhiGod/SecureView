import path from 'path';
import fs from 'fs';
import express from 'express';
import { db } from '../../config/db.js';
import { auth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/documents', auth('user'), (req, res) => {
  const list = db
    .prepare(
      `SELECT id, title, total_pages, created_at
       FROM documents
       WHERE status = 'ready'
       ORDER BY id DESC`
    )
    .all();
  res.json({ list });
});

router.get('/documents/:id', auth('user'), (req, res) => {
  const id = Number(req.params.id);
  const doc = db
    .prepare(
      `SELECT id, title, total_pages, created_at
       FROM documents
       WHERE id = ? AND status = 'ready'`
    )
    .get(id);

  if (!doc) {
    return res.status(404).json({ message: 'Document not found' });
  }
  return res.json(doc);
});

router.get('/documents/:id/pages/:pageNo/image', auth('user'), (req, res) => {
  const id = Number(req.params.id);
  const pageNo = Number(req.params.pageNo);

  if (!Number.isInteger(id) || !Number.isInteger(pageNo) || pageNo <= 0) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  const page = db
    .prepare(
      `SELECT dp.image_path
       FROM document_pages dp
       JOIN documents d ON d.id = dp.document_id
       WHERE dp.document_id = ? AND dp.page_no = ? AND d.status = 'ready'`
    )
    .get(id, pageNo);

  if (!page) {
    return res.status(404).json({ message: 'Page not found' });
  }

  const imagePath = path.resolve(page.image_path);
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ message: 'Image missing on server' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.sendFile(imagePath);
});

export default router;
