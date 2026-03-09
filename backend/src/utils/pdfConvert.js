import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { db } from '../config/db.js';

const execFileAsync = promisify(execFile);

export async function convertPdfToImages(documentId, pdfPath, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  // Clean stale rendered pages from previous conversions.
  fs.readdirSync(outputDir)
    .filter((name) => /^page-\d+\.png$/.test(name))
    .forEach((name) => fs.unlinkSync(path.join(outputDir, name)));

  const outputPrefix = path.join(outputDir, 'page');
  try {
    await execFileAsync('pdftoppm', ['-png', '-r', '144', pdfPath, outputPrefix]);
  } catch (error) {
    db.prepare('UPDATE documents SET status = ? WHERE id = ?').run('failed', documentId);
    throw new Error(`PDF conversion failed: ${error.message}`);
  }

  const files = fs
    .readdirSync(outputDir)
    .filter((name) => /^page-\d+\.png$/.test(name))
    .sort((a, b) => {
      const an = Number(a.match(/(\d+)/)[1]);
      const bn = Number(b.match(/(\d+)/)[1]);
      return an - bn;
    });

  const insertPage = db.prepare(
    'INSERT INTO document_pages (document_id, page_no, image_path) VALUES (?, ?, ?)'
  );
  const updateDoc = db.prepare('UPDATE documents SET status = ?, total_pages = ? WHERE id = ?');

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM document_pages WHERE document_id = ?').run(documentId);
    files.forEach((name, idx) => {
      insertPage.run(documentId, idx + 1, path.join(outputDir, name));
    });
    updateDoc.run('ready', files.length, documentId);
  });

  tx();

  if (!files.length) {
    db.prepare('UPDATE documents SET status = ? WHERE id = ?').run('failed', documentId);
    throw new Error('No pages generated from PDF');
  }
}
