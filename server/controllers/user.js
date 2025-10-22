import 'dotenv/config';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const secretKey = process.env.JWT_SECRET;
const hostname = process.env.hostname || 'localhost';
const port = process.env.PORT || 5000;


export const register = async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    const existingUser = await User.findOne({ email });
    const hashedPassword = await bcrypt.hash(password, 10);
    const token = jwt.sign({ email }, secretKey);
    const defaultPicture = `${hostname}:${port}/uploads/default-picture.jpg`;

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
        picture: defaultPicture
    });

    newUser.password = undefined;

    res.send({
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

    const token = jwt.sign({ email }, secretKey);
    res.send({
        message: 'Login successful',
        user,
        accessToken: token
    });
};
