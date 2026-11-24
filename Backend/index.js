
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import agentRouter from "./routes/agent.routes.js";
import chatRouter from "./routes/chat.routes.js";
import integrationRouter from "./routes/integration.route.js";
import paymentRouter from "./routes/payment.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials:true
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth",authRouter)
app.use("/api/agents", agentRouter);
app.use("/api/chat", chatRouter);
app.use("/api/integrations", integrationRouter);
app.use("/api/payments", paymentRouter);


const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Nexora AI API running at ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("API startup failed:", error.message);
  process.exitCode = 1;
});