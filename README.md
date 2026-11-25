# Nexora AI – AI-Powered Multi-Agent Assistant

Nexora AI is a full-stack AI-powered assistant designed to simplify everyday tasks through intelligent conversations, specialized AI agents, and third-party integrations. Built with the MERN stack, LangGraph, and Model Context Protocol (MCP), it combines Generative AI with real-world automation.

## 🚀 Features

### 🤖 AI-Powered Conversations
- Interactive AI chat interface for natural-language conversations.
- Context-aware responses using Large Language Models (LLMs).
- Supports specialized agent workflows for different tasks.

### 🧠 Multi-Agent Architecture
- Built with LangGraph to orchestrate specialized AI agents.
- Uses MCP to connect AI agents with external tools.
- Supports web search and image analysis.
- Routes user requests to appropriate tools and workflows.

### 🔗 Third-Party Integrations
- **Gmail:** Connect accounts, search emails, and retrieve email information.
- **Google Calendar:** Create events and retrieve calendar information.
- **Instagram:** Generate captions and publish image posts.
- **Web Search:** Retrieve information from the internet using search tools.

### 🔐 Authentication & Security
- OAuth 2.0 integration for connecting third-party services.
- Secure authentication and protected API endpoints.
- User-specific integration management.

### ⚡ Interactive User Interface
- Responsive React-based interface.
- State management with Redux Toolkit.
- Modern styling with Tailwind CSS.
- Integrated workflows for AI-powered tasks.

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React, Redux Toolkit, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| AI / LLM | LangChain.js, LangGraph, Gemini API, OpenAI API |
| AI Tool Integration | Model Context Protocol (MCP) |
| Authentication | JWT, OAuth 2.0 |
| External Services | Gmail API, Google Calendar API, Instagram Graph API, Tavily |
| Deployment | Render, Vercel |

## 🏗️ Architecture

Nexora AI follows a full-stack architecture where the frontend communicates with the backend through REST APIs. The backend manages authentication, conversations, and AI agent execution.

The agent workflow uses LangGraph for orchestration and MCP for connecting specialized tools and external services.

**High-level workflow:**

1. User submits a request through the React interface.
2. Backend processes the request and initializes the appropriate AI workflow.
3. LangGraph coordinates the agent execution.
4. MCP provides access to external tools and integrations.
5. The selected tool executes the requested operation.
6. Results are returned to the user through the chat interface.

## ⚙️ Installation & Setup

### Prerequisites

- Node.js
- npm
- MongoDB
- API keys for the AI providers and external services you want to use.

### 1. Clone the repository

```bash
git clone https://github.com/Ganeshmurdeshwarr/Nexora-AI.git

cd Nexora-AI
```

### 2. Install frontend dependencies

```bash
cd Frontend
npm install
```

### 3. Install backend dependencies

```bash
cd ../Backend
npm install
```

### 4. Configure environment variables

Create `.env` files in the respective frontend and backend directories.

**Backend `.env`**

```env
PORT=8000
MONGODB_URI=

JWT_SECRET=

GEMINI_API_KEY=
OPENAI_API_KEY=
TAVILY_API_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

INSTAGRAM_GRAPH_VERSION=
```

Add other provider credentials and configuration required by your implementation.

**Frontend `.env`**

```env
VITE_API_URL=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

Never commit actual API keys, OAuth secrets, access tokens, or private credentials.

### 5. Run the application

Start the backend:

```bash
cd Backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd Frontend
npm run dev
```

## 🔮 Future Enhancements

- Add more specialized AI agents and MCP tool integrations.
- Improve long-term conversation memory.
- Expand document-based RAG capabilities.
- Add advanced workflow monitoring and execution history.
- Improve agent performance and error handling.

## 👨‍💻 Author

**Shreeganesh Devadiga**

- LinkedIn: https://www.linkedin.com/in/ganesh-devadiga-664273294/
- GitHub: https://github.com/Ganeshmurdeshwarr
- Portfolio: https://portfolio-ganesh-devadiga.vercel.app

---

**Nexora AI** – Bringing Generative AI, intelligent agents, and everyday automation together.
