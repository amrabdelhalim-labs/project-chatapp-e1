import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import { createToken } from '../utils/jwt.js';
import { getIO } from '../utils/socket.js';
import { getRepositoryManager } from '../repositories/index.js';
import { getStorageService } from '../services/storage/storage.service.js';
import {
  validateRegisterInput,
  validateLoginInput,
  validateUpdateUserInput,
} from '../validators/user.validator.js';

const repos = getRepositoryManager();

export const register = async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;

  // Validate input before any DB or crypto operations
  validateRegisterInput({ firstName, lastName, email, password, confirmPassword });

  // Check email uniqueness before hashing
  const emailTaken = await repos.user.emailExists(email);
  if (emailTaken) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: 'هذا البريد الإلكتروني مسجل بالفعل' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const storage = getStorageService();
  const defaultPicture = storage.getFileUrl('default-picture.jpg');

  const newUser = await repos.user.createUser({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    profilePicture: defaultPicture,
  });

  getIO().emit('user_created', newUser);

  const token = createToken(newUser._id);

  res.status(StatusCodes.CREATED).json({
    message: 'User registered successfully',
    user: newUser,
    accessToken: token,
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  validateLoginInput({ email, password });

  const user = await repos.user.findByEmail(email);
  if (!user) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'المستخدم غير موجود' });
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'بيانات الدخول غير صحيحة' });
  }

  user.password = undefined;
  const token = createToken(user._id);

  res.status(StatusCodes.OK).json({
    message: 'Login successful',
    user,
    accessToken: token,
  });
};

export const getProfile = async (req, res) => {
  const user = await repos.user.findByIdSafe(req.userId);
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'المستخدم غير موجود' });
  }
  res.status(StatusCodes.OK).json(user);
};

export const getUsers = async (req, res) => {
  const users = await repos.user.findAllExcept(req.userId);
  res.status(StatusCodes.OK).json(users);
};

export const updateUser = async (req, res) => {
  const { firstName, lastName, status } = req.body;

  validateUpdateUserInput({ firstName, lastName, status });

  const user = await repos.user.updateProfile(req.userId, { firstName, lastName, status });
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'المستخدم غير موجود' });
  }

  getIO().emit('user_updated', user);
  res.status(StatusCodes.OK).json(user);
};

export const updateProfilePicture = async (req, res) => {
  if (!req.file) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'يجب رفع صورة' });
  }

  const storage = getStorageService();

  // Upload new picture via storage service
  const uploadResult = await storage.uploadFile(req.file);
  const newFileUrl = uploadResult.url;

  const { previousPicture, user } = await repos.user.updateProfilePicture(
    req.userId,
    newFileUrl
  );

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'المستخدم غير موجود' });
  }

  getIO().emit('user_updated', user);

  // Delete old profile picture via storage service (skip default)
  if (previousPicture) {
    await storage.deleteFile(previousPicture);
  }

  res.status(StatusCodes.OK).json(user);
};