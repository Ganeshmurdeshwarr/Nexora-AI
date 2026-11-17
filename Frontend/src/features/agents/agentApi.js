import api from "@/api";

export const createAgent = async (name, knowledgeBase, instructions, tools) => {
  try {
    const response = await api.post(
      "/api/agents",{
      name,
      knowledgeBase,
      instructions,
      tools,}
    );
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const getAllAgent = async () => {
  try {
    const response = await api.get("/api/agents");
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const getAgentById = async (agentId) => {
  try {
    const response = await api.get(`/api/agents/${agentId}`);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const deleteAgent = async (agentId) => {
  try {
    const response = await api.delete(`/api/agents/${agentId}`);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};
