import "dotenv/config";
import jwt from "jsonwebtoken";

export default async function isAuthenticated(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.send({ message: "Authentication invalid" });
  };

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.email = payload.email;
    next();
  } catch (error) {
    return res.send({ message: "Authentication invalid" });
  };
};