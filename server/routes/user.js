import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import upload from '../middlewares/multer.js';
import {
  register,
  login,
  getProfile,
  getUsers,
  updateUser,
  updateProfilePicture,
} from '../controllers/user.js';

const userRouter = express.Router();

userRouter.post('/register', register);
userRouter.post('/login', login);
userRouter.get('/profile', isAuthenticated, getProfile);
userRouter.get('/friends', isAuthenticated, getUsers);
userRouter.put('/profile', isAuthenticated, updateUser);
userRouter.put('/profile/picture', [isAuthenticated, upload.single('file')], updateProfilePicture);

export default userRouter;
