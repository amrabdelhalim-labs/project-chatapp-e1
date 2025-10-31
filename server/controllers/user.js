import 'dotenv/config';
import { StatusCodes } from 'http-status-codes';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { io } from '../index.js';
import fs from 'fs';
import path from 'path';

const secretKey = process.env.JWT_SECRET;
const hostname = process.env.hostname || 'localhost';
const port = process.env.PORT || 5000;


export const register = async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    const existingUser = await User.findOne({ email });
    const hashedPassword = await bcrypt.hash(password, 10);
    // token must be generated from the created user's _id, not the model
    // we'll generate it after creating the user to ensure we have the id
    const defaultPicture = `http://${hostname}:${port}/uploads/default-picture.jpg`;

    if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
    };

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    };

    const newUser = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        profilePicture: defaultPicture
    });

    newUser.password = undefined;
    io.emit('user_created', newUser);

    // Now that we have the newUser, sign token with its _id
    const token = jwt.sign({ userId: newUser._id }, secretKey);

    res.status(StatusCodes.CREATED).json({
        message: 'User registered successfully',
        user: newUser,
        accessToken: token
    });
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: 'User does not exist' });
    };

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
        return res.status(400).json({ message: 'Invalid credentials' });
    };

    user.password = undefined;

    const token = jwt.sign({ userId: user._id }, secretKey);
    res.status(StatusCodes.OK).json({
        message: 'Login successful',
        user,
        accessToken: token
    });
};


export const getProfile = async (req, res) => {
    const userId = req.userId;
    const user = await User.findById(userId);

    user.password = undefined;

    res.status(StatusCodes.OK).json(user);
};

export const getUsers = async (req, res) => {
    const users = await User.find({ _id: { $ne: req.userId } }).select(
        "-password"
    );

    res.status(StatusCodes.OK).json(users);
};

export const updateUser = async (req, res) => {
    const userId = req.userId;
    const { firstName, lastName, status } = req.body;

    const user = await User.findByIdAndUpdate(
        userId,
        { firstName, lastName, status },
        { new: true }
    );

    user.password = undefined;
    io.emit("user_updated", user);

    res.status(StatusCodes.OK).json(user);
};

export const updateProfilePicture = async (req, res) => {
    const userId = req.userId;
    const newFileUrl = `http://${hostname}:${port}/uploads/${req.file?.filename}`;

    // احصل على رابط الصورة القديمة قبل التحديث لمحاولة حذفها لاحقاً
    const previous = await User.findById(userId).select('profilePicture');

    const user = await User.findByIdAndUpdate(
        userId,
        { profilePicture: newFileUrl },
        { new: true }
    );

    user.password = undefined;
    io.emit("user_updated", user);

    // حذف الصورة القديمة من النظام إن لم تكن هي الصورة الافتراضية
    try {
        const oldUrl = previous?.profilePicture;
        
        if (oldUrl) {
            const urlObj = new URL(oldUrl);
            const oldFileName = path.basename(urlObj.pathname); // e.g. default-picture.jpg أو اسم فريد

            if (oldFileName && oldFileName !== 'default-picture.jpg') {
                const oldFilePath = path.join(process.cwd(), 'public', 'uploads', oldFileName);
                
                await fs.promises.unlink(oldFilePath).catch((err) => {
                    if (err?.code !== 'ENOENT') {
                        console.error('Failed to delete old profile picture:', err.message);
                    };
                });
            };
        };
    } catch (err) {
        console.error('Error while cleaning old profile picture:', err?.message || err);
    };

    res.status(StatusCodes.OK).json(user);
};