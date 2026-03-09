import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(rootDir, '.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
  jwtExpire: process.env.JWT_EXPIRE || '12h',
  dbPath: process.env.DB_PATH || path.join(rootDir, 'data', 'app.db'),
  storageRoot: process.env.STORAGE_ROOT || path.join(rootDir, 'storage'),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  initialPasswordKey: process.env.INITIAL_PASSWORD_KEY || '0123456789abcdef0123456789abcdef',
};

if (env.initialPasswordKey.length !== 32) {
  throw new Error('INITIAL_PASSWORD_KEY must be exactly 32 chars');
}

export { rootDir };
