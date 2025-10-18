import 'dotenv/config';
import express from 'express';
import userRouter from './routes/user.js';
import { connectDB } from './config.js';
import cors from 'cors';

// Set up Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(cors());

// Routes
app.get('/', (req, res) => {
  res.send('Hello from the server!');
});

app.use('/api/user', userRouter);

// Connections
connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});