import { StatusCodes } from 'http-status-codes';
import { getRepositoryManager } from '../repositories/index.js';
import { validateMessageInput } from '../validators/message.validator.js';

const repos = getRepositoryManager();

export const createMessage = async (req, res) => {
  const senderId = req.userId;
  const { receiverId, content } = req.body;

  validateMessageInput({ receiverId, content });

  const message = await repos.message.create({
    sender: senderId,
    recipient: receiverId,
    content: content.trim(),
  });

  res.status(StatusCodes.CREATED).json(message);
};

export const getMessages = async (req, res) => {
  const userId = req.userId;
  const { page, limit } = req.query;

  // Support optional pagination via query params
  if (page && limit) {
    const result = await repos.message.findAllForUserPaginated(
      userId,
      parseInt(page),
      parseInt(limit)
    );
    return res.status(StatusCodes.OK).json(result);
  }

  const messages = await repos.message.findAllForUser(userId);
  res.status(StatusCodes.OK).json(messages);
};

export const getConversation = async (req, res) => {
  const userId = req.userId;
  const { contactId } = req.params;

  if (!contactId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'معرف جهة الاتصال مطلوب' });
  }

  const messages = await repos.message.findConversation(userId, contactId);
  res.status(StatusCodes.OK).json(messages);
};

export const markAsSeen = async (req, res) => {
  const userId = req.userId;
  const { senderId } = req.params;

  if (!senderId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'معرف المرسل مطلوب' });
  }

  const result = await repos.message.markAsSeen(senderId, userId);
  res.status(StatusCodes.OK).json({ modifiedCount: result });
};
