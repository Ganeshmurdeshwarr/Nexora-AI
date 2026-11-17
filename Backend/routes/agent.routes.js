import express from "express";

import {
  createAgent,
  getAllAgents,
  getAgentById,
  deleteAgent,
} from "../controllers/agent.controller.js";
import { protect } from "../middleware/protect.js";



const agentRouter = express.Router();

// All routes require authentication
agentRouter.use(protect);

agentRouter.post("/", protect, createAgent);
agentRouter.get("/",protect, getAllAgents);
agentRouter.get("/:id",protect, getAgentById);
agentRouter.delete("/:id", protect, deleteAgent);

export default agentRouter;