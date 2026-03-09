import fs from 'fs';
import path from 'path';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env } from './config/env.js';
import './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import adminRoutes from './modules/admin/admin.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import viewerRoutes from './modules/viewer/viewer.routes.js';

fs.mkdirSync(env.storageRoot, { recursive: true });
fs.mkdirSync(path.join(env.storageRoot, 'pdfs'), { recursive: true });
fs.mkdirSync(path.join(env.storageRoot, 'pages'), { recursive: true });
fs.mkdirSync(path.join(env.storageRoot, 'imports'), { recursive: true });

const app = express();

app.use(cors({ origin: env.frontendOrigin, credentials: false }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/viewer', viewerRoutes);

app.use(errorHandler);

export default app;
