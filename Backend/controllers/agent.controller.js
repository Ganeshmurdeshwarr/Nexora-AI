import mongoose from "mongoose";
import Agent from "../models/agent.model.js";

export const createAgent = async (req, res) => {
  try {
    const { name, knowledgeBase, instructions, tools } = req.body;

    if (
      !name?.trim() ||
      !instructions?.trim() ||
      !knowledgeBase.trim() ||
      !tools
    ) {
      return res.status(400).json({
        message: "Agent name and instructions are required.",
      });
    }

    const existingAgentName = await Agent.findOne({name})
    if(existingAgentName){
      return  res.status(400).json({
        message: "Agent with this  name already exist.",
      })
    }

    const agent = await Agent.create({
      userId: req.user._id,
      name: name.trim(),
      knowledgeBase,
      instructions: instructions.trim(),
      tools,
    });

    return res.status(201).json( agent );
  } catch (error) {
    console.error("Create agent error:", error);
    return res.status(500).json({
      message: "Failed to create agent.",
    });
  }
};

export const getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find({
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json(
      agents,
    );
  } catch (error) {
    console.error("Get agents error:", error);

    return res.status(500).json({
      message: "Failed to fetch agents.",
    });
  }
};

export const getAgentById = async (req, res) => {
  try {
    const agentId = req.params.id;

    if (!mongoose.isValidObjectId(agentId)) {
      return res.status(400).json({
        message: "Invalid agent ID.",
      });
    }

    const agent = await Agent.findById(agentId);

    if (!agent) {
      return res.status(404).json({
        message: "Agent not found.",
      });
    }

    return res.status(200).json(
      agent
    );
  } catch (error) {
    console.error("Get agent error:", error);

    return res.status(500).json({
      message: "Failed to fetch agent.",
    });
  }
};

export const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid agent ID.",
      });
    }

    const agent = await Agent.findOneAndDelete(id);

    if (!agent) {
      return res.status(404).json({
        message: "Agent not found.",
      });
    }

    return res.status(200).json({
      message: "Agent deleted successfully.",
    });
  } catch (error) {
    console.error("Delete agent error:", error);

    return res.status(500).json({
      message: "Failed to delete agent.",
    });
  }
};
