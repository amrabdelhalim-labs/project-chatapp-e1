import 'dotenv/config';
import express from 'express';
import userRouter from './routes/user.js';
import messageRouter from './routes/message.js';
import { connectDB, connectServer } from './config.js';
import isAuthenticated, { isSocketAuthenticated } from './middlewares/isAuthenticated.js';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import Message from './models/Message.js';

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
app.use("/api/message", isAuthenticated, messageRouter);

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

  socket.on("typing", (receiverId) => {
    socket.to(receiverId).emit("typing", socket.userId);
  });

  socket.on("stop_typing", (receiverId) => {
    socket.to(receiverId).emit("stop_typing", socket.userId);
  });

  socket.on("seen", async (receiverId) => {
    // نحصل على معرف المرسل من الاتصال الحالي
    const senderId = socket.userId;

    // نطبع رسالة في وحدة التحكم لتوضيح أن الرسائل من المرسل تم وضع علامة "مقروءة" من قبل المستقبل
    console.log(`Marking messages from ${senderId} as seen by ${receiverId}`);

    // نقوم بتحديث حالة جميع الرسائل التي لم تُقرأ بعد
    await Message.updateMany(
      { sender: senderId, recipient: receiverId, seen: false }, // تحديد الرسائل التي لم تُقرأ بعد
      { seen: true }, // تحديث الحالة إلى "مقروءة"
      { multi: true } // تحديد أنه يجب تحديث جميع الرسائل المطابقة
    ).exec();

    // نرسل حدث "seen" إلى جميع العملاء لتحديث حالة الرسائل لديهم
    io.emit("seen", senderId);
  });

  socket.on("send_message", async ({ receiverId, content, clientId }) => {
    const senderId = socket.userId;
    const message = await Message.create({ sender: senderId, recipient: receiverId, content });

    // Include clientId in the response so frontend can reconcile optimistic message
    const messageWithClientId = clientId ? { ...message.toObject(), clientId } : message;

    // Broadcast to both sender and recipient rooms
    io.to([receiverId, senderId]).emit("receive_message", messageWithClientId);
  });
});