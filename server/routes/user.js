import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { register, login, getProfile, getUsers } from '../controllers/user.js';

const userRouter = express.Router();

userRouter.post('/register', register);
userRouter.post('/login', login);
userRouter.get("/profile", isAuthenticated, getProfile);
userRouter.get("/friends", isAuthenticated, getUsers);

export default userRouter;