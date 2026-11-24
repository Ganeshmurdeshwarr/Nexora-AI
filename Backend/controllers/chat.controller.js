import { HumanMessage } from "@langchain/core/messages";
import chatGraph from "../utils/chatGraph.js";
import Agent from "../models/agent.model.js";
import { createAgentGraph, resumeAgentGraph } from "../utils/agentGraph.js";
import {
  assertSufficientCredits,
  deductCredits,
  InsufficientCreditsError,
} from "../utils/deductCredits.js";

export const chat = async (req, res) => {
  try {
    const { message, conversationId } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Message is required.",
      });
    }

    if (
      typeof conversationId !== "string" ||
      !conversationId.trim() ||
      conversationId.length > 128
    ) {
      return res.status(400).json({
        message: "A valid conversation ID is required.",
      });
    }

    const threadId = `${req.user._id}:${conversationId}`;

    if (message.length > 10000) {
      return res.status(400).json({
        message: "Message cannot exceed 10000 characters.",
      });
    }

    await assertSufficientCredits({ userId: req.user._id, credits: 2 });

    const data = await chatGraph.invoke(
      {
        messages: [new HumanMessage(message.trim())],
      },
      {
        configurable: { thread_id: threadId },
      },
    );
    await deductCredits({ userId: req.user._id, credits: 2 });

    const lastMessage = data.messages.at(-1).content;

    return res.status(200).json({
      aiMessage: lastMessage,
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return res.status(402).json({
        message: "Insufficient credits.",
      });
    }

    console.error("Normal chat error:", error);

    return res.status(502).json({
      message: "Unable to generate an AI response.",
    });
  }
};



export const agentChat = async (req, res) => {
  try {
    const { message, agent, conversationId } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Message is required.",
      });
    }

    if (
      typeof conversationId !== "string" ||
      !conversationId.trim() ||
      conversationId.length > 128
    ) {
      return res.status(400).json({
        message: "A valid conversation ID is required.",
      });
    }

    const existingAgent = await Agent.findOne({ name: agent });
    
    if (!existingAgent) {
      return res.status(400).json({ message: "Agent not found" });
    }

    await assertSufficientCredits({ userId: req.user._id, credits: 10 });

    const threadId = `${req.user._id.toString()}:${existingAgent?._id}:${conversationId}`;

    const graph = await createAgentGraph(existingAgent, req.user._id);
    const result = await graph.invoke(
      {
        messages: [new HumanMessage(message.trim())],
      },
      {
        configurable: { thread_id: threadId },
        recursionLimit: 10,
      },
    );
        await deductCredits({ userId: req.user._id, credits: 10 });

    const lastMessage = result.messages.at(-1).content;

    return res.status(200).json({
      aiMessage:lastMessage,
      interrupted:Boolean(result.__interrupt__?.length),
      interrupts:(result.__interrupt__ || []).map((item)=>({
        id:item.id,
        value:item.value
      }))

    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return res.status(402).json({
        message: "Insufficient credits.",
      });
    }

    console.error("agent chat error--:", error);
    return res.status(502).json({
      message: "Unable to generate an AI response.",
    });
  }
};



export const approveTool=async(req , res)=>{
try {
  const { agent, approved, conversationId } = req.body || {}
  
    const existingAgent = await Agent.findOne({ name: agent });
    const userId = req.user._id
    
    if (!existingAgent) {
      return res.status(400).json({ message: "Agent not found" });
    }
    if (
      typeof conversationId !== "string" ||
      !conversationId.trim() ||
      conversationId.length > 128
    ) {
      return res.status(400).json({
        message: "A valid conversation ID is required.",
      });
    }
    await assertSufficientCredits({ userId, credits: 10 });

    const threadId = `${req.user._id.toString()}:${existingAgent?._id}:${conversationId}`;
    const result  = await resumeAgentGraph({agent:existingAgent,threadId , userId,approved

    })
        await deductCredits({ userId: req.user._id, credits: 10 });

    return res.status(200).json(result)

} catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return res.status(402).json({
        message: "Insufficient credits.",
      });
    }

    return res.status(502).json({
      message: `approve tools controller error ${error}`,
    });
}
}