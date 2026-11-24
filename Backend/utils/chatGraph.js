import dotenv from "dotenv"
import { ChatGroq } from "@langchain/groq";
import {
    StateGraph,
    MessagesAnnotation,
    START,
    END,
} from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoClient } from "mongodb";
dotenv.config()




const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey:process.env.GROQ_MODEL,
    temperature: 0,
    maxTokens: undefined,
    maxRetries: 2,
})


const client = new MongoClient(process.env.MONGODB_URI);
const checkpointer = new MongoDBSaver({ client, dbName: "langgraph" });



const chatNode = async (state) => {
     const recentMessages = state.messages.slice(-4)

  const response = await llm.invoke(recentMessages);
  return {
    messages: [response],
  };
};

const builder = new StateGraph(MessagesAnnotation)
  .addNode("chatNode", chatNode)
  .addEdge("__start__","chatNode")
  .addEdge("chatNode", "__end__");

const chatGraph = builder.compile({checkpointer});

export default chatGraph



