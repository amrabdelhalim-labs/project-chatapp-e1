import jwt from 'jsonwebtoken';
import 'dotenv/config';

// Validate JWT_SECRET is set at module load time
if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not defined in environment variables. ' +
      'Set it in .env file or as an environment variable on your hosting platform.'
  );
}

const JWT_SECRET = process.env.JWT_SECRET;

export function createToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
