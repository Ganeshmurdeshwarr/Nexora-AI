import api from "@/api";

export const chat = async (message, conversationId) => {
  const { data } = await api.post("/api/chat", {
    message,
    conversationId,
  });

  return data.aiMessage;
};

export const agentChat = async (message, agent, conversationId) => {
  const { data } = await api.post("/api/chat/agent", {
    message,
    agent,
    conversationId,
  });

  return data;
};

// Approve or reject an email
export const agentResume = async ({ agent, approved, conversationId }) => {
  const response = await api.post("/api/chat/agent/resume", {
    agent,
    approved,
    conversationId,
  });


  return response?.data;
};
