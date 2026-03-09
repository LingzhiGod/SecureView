import crypto from 'crypto';

const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';

export function generateRandomPassword(length = 10) {
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
