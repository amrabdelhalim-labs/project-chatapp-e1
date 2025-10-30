import "dotenv/config";
import jwt from "jsonwebtoken";

export default function isAuthenticated(req, res, next) {
  // Support standard 'Authorization: Bearer <token>' header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

  if (!token) {
    return res.status(401).json({ message: "Authentication invalid" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Authentication invalid" });
  }
};

export const isSocketAuthenticated = (socket, next) => {
  if (!socket.handshake.query || !socket.handshake.query.token) {
    return next(new Error("Authentication invalid"));
  };

  try {
    const data = jwt.verify(socket.handshake.query.token, process.env.JWT_SECRET);

    socket.userId = data.userId;
    next();
  } catch (error) {
    next(error);
  };
};