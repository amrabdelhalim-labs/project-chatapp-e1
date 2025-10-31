import express from "express";
import { createMessage, getMessages, seen } from "../controllers/message.js";

const messageRouter = express.Router();

messageRouter.post("/", createMessage);
messageRouter.get("/", getMessages);
messageRouter.put("/seen/:receiverId", seen);

export default messageRouter;