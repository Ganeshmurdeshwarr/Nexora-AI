import mongoose from "mongoose";
import Agent from "../models/agent.model.js";



export const createAgent = async (req, res) => {
  try {
    const { name, knowledgeBase, instructions, tools } =
      req.body;

    if (!name?.trim() || !instructions?.trim() || !knowledgeBase.trim() || !tools) {
      return res.status(400).json({
        success: false,
        message: "Agent name and instructions are required.",
      });
    }

    const agent = await Agent.create({
      userId: req.user._id,
      name: name.trim(),
      knowledgeBase,
      instructions: instructions.trim(),
      tools,
    });

    return res.status(201).json({
      success: true,
      message: "Agent created successfully.",
      agent,
    });
  } catch (error) {
    console.error("Create agent error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create agent.",
    });
  }
};


export const getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find({
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: agents.length,
      agents,
    });
  } catch (error) {
    console.error("Get agents error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch agents.",
    });
  }
};


export const getAgentById = async (req, res) => {
  try {
    const agentId = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agent ID.",
      });
    }

    const agent = await Agent.findById({
     agentId });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found.",
      });
    }

    return res.status(200).json({
      success: true,
      agent,
    });
  } catch (error) {
    console.error("Get agent error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch agent.",
    });
  }
};





export const deleteAgent = async (req, res) => {
  try {
    const agentId = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agent ID.",
      });
    }

    const agent = await Agent.findOneAndDelete({
      agentId
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Agent deleted successfully.",
    });
  } catch (error) {
    console.error("Delete agent error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete agent.",
    });
  }
};