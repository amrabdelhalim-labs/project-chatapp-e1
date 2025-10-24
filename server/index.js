import 'dotenv/config';
import express from 'express';
import userRouter from './routes/user.js';
import { connectDB, connectServer } from './config.js';
import isAuthenticated, { isSocketAuthenticated } from './middlewares/isAuthenticated.js';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';

// Set up Express app
const app = express();
const server = http.createServer(app);

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
connectServer(server);

// Websocket
export const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.use(isSocketAuthenticated);

io.on("connection", async (socket) => {
  console.log(`user connected: ${socket.userId}`);

  socket.join(socket.userId);

  socket.on("disconnect", () => {
    console.log(`user disconnected: ${socket.userId}`);
  });
});