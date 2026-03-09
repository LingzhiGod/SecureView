import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function auth(requiredRole) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const queryToken = typeof req.query.token === 'string' ? req.query.token : '';
    const token = bearerToken || queryToken;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const payload = jwt.verify(token, env.jwtSecret);
      req.auth = payload;

      if (requiredRole && payload.role !== requiredRole) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      next();
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}
