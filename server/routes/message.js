import express from 'express';
import {
  createMessage,
  getMessages,
  getConversation,
  markAsSeen,
} from '../controllers/message.js';

const messageRouter = express.Router();

messageRouter.post('/', createMessage);
messageRouter.get('/', getMessages);
messageRouter.get('/conversation/:contactId', getConversation);
messageRouter.patch('/seen/:senderId', markAsSeen);

export default messageRouter;