import Message from "../models/Message.js";
import { StatusCodes } from "http-status-codes";

export const createMessage = async (req, res) => {
    const senderId = req.userId;
    const { receiverId, content } = req.body;

    if (!content || content.trim() === "") {
        return res.status(StatusCodes.BAD_REQUEST).json({
            error: "Message content is required",
        });
    };

    const message = await Message.create({ sender: senderId, recipient: receiverId, content });

    res.status(StatusCodes.CREATED).json(message);
};

export const getMessages = async (req, res) => {
    const userId = req.userId;

    const messages = await Message.find({
        $or: [{ sender: userId }, { recipient: userId }],
    });

    res.status(StatusCodes.OK).json(messages);
};

