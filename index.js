import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import userRouter from './routes/user.js';
import messageRouter from './routes/message.js';
import { connectDB, connectServer } from './config.js';
import isAuthenticated, { isSocketAuthenticated } from './middlewares/isAuthenticated.js';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import { StatusCodes } from 'http-status-codes';
import { setIO, getIO } from './utils/socket.js';
import { getRepositoryManager } from './repositories/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// Routes
app.get('/', (req, res) => {
  res.send('Hello from the server!');
});

app.get('/api/health', async (req, res) => {
  const repos = getRepositoryManager();
  const health = await repos.healthCheck();
  const status = health.database === 'connected' ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE;
  res.status(status).json(health);
});

app.use('/api/user', userRouter);
app.use('/api/message', isAuthenticated, messageRouter);

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message || err);

  // Multer file size exceeded
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: 'File size exceeds the allowed limit (1 MB)' });
  }

  // Multer unexpected field or fileFilter rejection
  if (
    err.code === 'LIMIT_UNEXPECTED_FILE' ||
    err.message?.includes('يجب أن تكون الملفات') ||
    err.message?.includes('Only image files')
  ) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: err.message || 'Unsupported file type' });
  }

  if (err.name === 'ValidationError') {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'خطأ في البيانات المدخلة',
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.name === 'CastError') {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'معرف غير صالح' });
  }

  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({ message: err.message || 'خطأ في الخادم' });
});

// WebSocket setup
function setupWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  setIO(io);
  io.use(isSocketAuthenticated);

  io.on('connection', async (socket) => {
    console.log(`user connected: ${socket.userId}`);
    const repos = getRepositoryManager();

    socket.join(socket.userId);

    socket.on('disconnect', () => {
      console.log(`user disconnected: ${socket.userId}`);
    });

    socket.on('typing', (receiverId) => {
      socket.to(receiverId).emit('typing', socket.userId);
    });

    socket.on('stop_typing', (receiverId) => {
      socket.to(receiverId).emit('stop_typing', socket.userId);
    });

    socket.on('seen', async (receiverId) => {
      const currentUserId = socket.userId;

      await repos.message.markAsSeen(receiverId, currentUserId);

      // Notify both parties to update UI with both IDs
      getIO().to([currentUserId, receiverId]).emit('seen', {
        readerId: currentUserId,
        senderId: receiverId,
      });
    });

    socket.on('send_message', async ({ receiverId, content, clientId }) => {
      if (!receiverId || !content?.trim()) return;

      const senderId = socket.userId;
      const message = await repos.message.create({
        sender: senderId,
        recipient: receiverId,
        content: content.trim(),
      });

      // Include clientId so frontend can reconcile optimistic message
      const messageWithClientId = clientId ? { ...message.toObject(), clientId } : message;

      // Broadcast to both sender and recipient rooms
      getIO().to([receiverId, senderId]).emit('receive_message', messageWithClientId);
    });
  });

  return io;
}

// Start server only when running directly (not imported by tests)
const isMainModule =
  process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].includes('nodemon'));

if (isMainModule) {
  connectDB();
  setupWebSocket(server);
  connectServer(server);
}

export { app, server, setupWebSocket };
