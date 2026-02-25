import { StatusCodes } from 'http-status-codes';
import { verifyToken } from '../utils/jwt.js';

export default function isAuthenticated(req, res, next) {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'التوثيق غير صالح' });
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'التوثيق غير صالح' });
  }
}

export const isSocketAuthenticated = (socket, next) => {
  if (!socket.handshake.query || !socket.handshake.query.token) {
    return next(new Error('التوثيق غير صالح'));
  }

  try {
    const data = verifyToken(socket.handshake.query.token);
    socket.userId = data.userId;
    next();
  } catch (error) {
    next(error);
  }
};
