import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../config/db.js';
import { signToken } from '../../utils/jwt.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { student_id: studentId, password } = req.body || {};
  if (!studentId || !password) {
    return res.status(400).json({ message: 'student_id and password are required' });
  }

  const user = db
    .prepare('SELECT id, name, student_id, password_hash FROM users WHERE student_id = ?')
    .get(studentId);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);

  const token = signToken({
    role: 'user',
    userId: user.id,
    name: user.name,
    studentId: user.student_id,
  });

  return res.json({
    token,
    user: { id: user.id, name: user.name, student_id: user.student_id },
  });
});

export default router;
