import api from "@/api";

export const chat = async (message) => {
  try {
    const {data} = await api.post("/api/chat", {
      message,
    });

    return data.aiMessage;
  } catch (error) {
return (error)  }
};

export const agentChat = async ( message, agent ) => {
  const {data} = await api.post("/api/chat/agent", {
    message,
    agent,
  });

  console.log("Agent chat response:",data);

  return data;
};

// // Approve or reject an email
// export const approveEmailApi = async ({ agentId, threadId, approved }) => {
//   const response = await api.post("/api/agent-chat/approve-email", {
//     agentId,
//     threadId,
//     approved,
//   });

//   console.log("Email approval response:", response.data);

//   return response.data.data;
// };
