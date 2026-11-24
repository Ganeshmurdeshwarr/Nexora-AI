import api from "@/api";

export const createAgent = async (name, knowledgeBase, instructions, tools) => {
  const response = await api.post("/api/agents", {
    name,
    knowledgeBase,
    instructions,
    tools,
  });
  return response.data;
};

export const getAllAgent = async () => {
  const response = await api.get("/api/agents");
  return response.data;
};

export const getAgentById = async (agentId) => {
  const response = await api.get(`/api/agents/${agentId}`);
  return response.data;
};

export const deleteAgent = async (agentId) => {
  const response = await api.delete(`/api/agents/${agentId}`);
  return response.data;
};
