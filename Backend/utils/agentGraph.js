import dotenv from "dotenv";
import { ChatGroq } from "@langchain/groq";
import {
  StateGraph,
  MessagesAnnotation,
  START,
  END,
  interrupt,
  Command,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoClient } from "mongodb";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getMCPTools } from "../mcp/langgraph-mcp.js";
import z from "zod";
import jwt from "jsonwebtoken";
import { DynamicStructuredTool } from "@langchain/core/tools";
dotenv.config();

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_MODEL,
  temperature: 0,
  maxTokens: undefined,
  maxRetries: 2,
});

const client = new MongoClient(process.env.MONGODB_URI);
const checkpointer = new MongoDBSaver({ client, dbName: "langgraph" });

const makeAuthToken = (userId) =>
  jwt.sign({}, process.env.MCP_AUTH_SECRET, {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: "2m",
    issuer: "Nexora_AI_Backend",
    audience: "nexora-mcp",
  });

const generatedCaption = async (imageUrl) => {
  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to fetch image . status: ${imageResponse.status}`,
      );
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const contentType = imageResponse.headers.get("content-type");

    const imageAnalyzer = new ChatGoogleGenerativeAI({
      model: "gemini-3.8-flash",
      temperature: 0,
      maxRetries: 2,
    });

    const message = new HumanMessage({
      content: [
        {
          type: "text",
          text: `Analyze this image and generate a catchy social media caption with relevant hashtags, STRICT RULES: Do not include any greetings , introductory text , explanation , or conversational filter(like "sure , here , is....., 'here is the a caption')/ output ONLY the caption and hashtags`,
        },
        {
          type: "image_url",
          image_url: `data:${contentType};base64,${base64Image}`,
        },
      ],
    });
    const response = await imageAnalyzer.invoke([message]);
    return response.content.trim();
  } catch (error) {
    console.error("Caption generation failed:", error);
    throw error;
  }
};

const limitMessageContext = (message, maxChars = 2000) => {
  if (typeof message.content !== "string") {
    return message;
  }

  if (message.content.length <= maxChars) {
    return message;
  }
  return {
    ...message,
    content: message.content.slice(0, maxChars) + `\n[content truncated]`,
  };
};

export const createAgentGraph = async (agent, userId) => {
  const findTool = (tools, names) => {
    return tools?.find((tool) => names?.includes(tool.name));
  };

  const enabledTool = new Set(agent?.tools || []);

  const isToolEnabled = (tool) => enabledTool.has(tool);


  const mcpTools = await getMCPTools();

  const webSearchMcpTool = findTool(mcpTools, [
    "web_search",
    "nexora_web_search",
  ]);

  const sendEmailMcpTool = findTool(mcpTools, [
    "send_email",
    "nexora_send_email",
  ]);

  const createCalendarMcpTool = findTool(mcpTools, [
    "create_calendar_event",
    "nexora_create_calendar_event",
  ]);

  const listEmailsMcpTool = findTool(mcpTools, [
    "list_emails",
    "nexora_list_emails",
  ]);
  const listCalendarEventsMcpTool = findTool(mcpTools, [
    "nexora_list_calendar_events",
    "list_calendar_events",
  ]);

  const publishOnInstagramMcpTool = findTool(mcpTools, [
    "nexora_publish_instagram_post",
    "publish_instagram_post",
  ]);
  const analyzeImageMcpTool = findTool(mcpTools, [
    "nexora_analyze_image",
    "analyze_image",
  ]);

  const finalTools = [];

  //  WEB SEARCH
  if (webSearchMcpTool && isToolEnabled("web_search")) {
    finalTools.push(
      new DynamicStructuredTool({
        name: "web_search",
        description: `search the web for current information, news , tutorials, documents , and factual questions`,
        schema: z.object({
          query: z.string().describe("the search query"),
        }),
        func: async ({ query }) => {
          try {
            const result = await webSearchMcpTool.invoke({ query });
            return result;
          } catch (error) {
            console.log(error);
          }
        },
      }),
    );
  }

  if (analyzeImageMcpTool && isToolEnabled("image_analyze")) {
    finalTools.push(
      new DynamicStructuredTool({
        name: "analyze_image",
        description: `Analyze an image using the vision model.

Use this tool when the user asks to explain, describe,
inspect, or understand an image.

Pass the publicly accessible image URL and the user's question.
Return the actual analysis from the image, not guesses based on its URL.`,
        schema: z.object({
        imageUrl: z
                .string()
                .url()
                .refine((url) => url.startsWith("https://")),
              prompt: z
                .string()
                .trim()
                .min(1)
                .max(2000)
                .default("Describe this image clearly and accurately."),
        }),
        func: async ({ imageUrl, prompt }) => {
          try {
            const result = await analyzeImageMcpTool.invoke({ imageUrl, prompt });
            return result;
          } catch (error) {
            console.log(error);
          }
        },
      }),
    );
  }

  // EMAIL
  if (sendEmailMcpTool && isToolEnabled("send_email")) {
    finalTools.push(
      new DynamicStructuredTool({
        name: "send_email",
        description: `Send an email using the authenticated user's connected Gmail account.

Infer a suitable email subject and body from the user's request.

If the user says "send an email and say hello":
- Subject: Hello
- Body: hello

Ask for the recipient email only if it is missing and cannot be
inferred from the conversation.

Never ask for authentication tokens, API keys, passwords, or user IDs.

The application will request explicit approval before sending the email.`,
        schema: z.object({
          to: z.string().email().describe("Recipient email address"),
          subject: z.string().trim().min(1).max(200).describe("Email subject"),
          body: z.string().trim().min(1).max(20000).describe("Email body"),
        }),
        func: async ({ to, subject, body }) => {
          try {
            const authToken = makeAuthToken(userId);
            const result = await sendEmailMcpTool.invoke({
              authToken,
              to,
              subject,
              body,
            });
            return result;
          } catch (error) {
            console.log(error);
          }
        },
      }),
    );
  }

  if (listEmailsMcpTool && isToolEnabled("list_gmail")) {
    finalTools.push(
      new DynamicStructuredTool({
        name: "list_emails",
        description: `
Search or list emails from the authenticated user's connected Gmail.

Examples:
- Show my latest emails.
- Show unread emails.
- Find emails from a specific sender.
- Find emails about an invoice.

Use Gmail search syntax:
- in:inbox
- is:unread
- from:someone@example.com
- subject:invoice
- newer_than:7d

Rules:
- For latest inbox emails, use "in:inbox".
- For unread emails, use "is:unread".
- Use maxResults 10 by default.
- This is read-only and does not require approval.
- Never invent email results.
`,

        schema: z.object({
          query: z
            .string()
            .trim()
            .max(500)
            .optional()
            .default("in:inbox")
            .describe("Gmail search query"),

          maxResults: z
            .number()
            .int()
            .min(1)
            .max(25)
            .optional()
            .default(10)
            .describe("Maximum number of emails"),
        }),

        func: async ({ query, maxResults }) => {
          try {
            const authToken = makeAuthToken(userId);
            const result = listEmailsMcpTool.invoke({
              authToken,
              query: query || "in:inbox",
              maxResults,
            });

            return result;
          } catch (error) {
            console.log(error);
          }
        },
      }),
    );
  }

  // CALENDAR

  if (createCalendarMcpTool && isToolEnabled("create_calendar_event")) {
    finalTools.push(
      new DynamicStructuredTool({
        name: "create_calendar_event",

        description: `
  Create an event in the authenticated user's primary Google Calendar.
  
  Infer the title and description from the user's request.
  
  Date and time rules:
  - Interpret today, tomorrow, and weekday references using the current
    date and time supplied in the conversation.
  - Default timezone: Asia/Kolkata.
  - If duration is missing, use 30 minutes.
  - Use ISO 8601 date-time strings with explicit timezone offsets.
  - If an essential meeting time is missing and cannot be inferred,
    ask the user instead of inventing a time.
  
  The application requires explicit approval before creating an event.
  `,

        schema: z.object({
          summary: z
            .string()
            .trim()
            .min(1)
            .max(200)
            .describe("Calendar event title"),

          description: z
            .string()
            .trim()
            .max(5000)
            .optional()
            .describe("Event description"),

          startDateTime: z
            .string()
            .datetime({ offset: true })
            .describe("Event start in ISO 8601 with timezone offset"),

          endDateTime: z
            .string()
            .datetime({ offset: true })
            .describe("Event end in ISO 8601 with timezone offset"),

          timeZone: z
            .string()
            .trim()
            .min(1)
            .default("Asia/Kolkata")
            .describe("timezone"),
        }),

        func: async ({
          summary,
          description,
          startDateTime,
          endDateTime,
          timeZone,
        }) => {
          try {
            const authToken = makeAuthToken(userId);
            const result = await createCalendarMcpTool.invoke({
              authToken,
              summary,
              description,
              startDateTime,
              endDateTime,
              timeZone,
            });

            return result;
          } catch (error) {
            console.log(error);
          }
        },
      }),
    );
  }

  if (listCalendarEventsMcpTool && isToolEnabled("list_calendar_events")) {
    finalTools.push(
      new DynamicStructuredTool({
        name: "list_calendar_events",
        description: `
Retrieve events from the authenticated user's primary Google Calendar.

Examples:
- "What are my meetings today?"
- "Show tomorrow's events."
- "What meetings do I have this week?"

Infer the requested date range using Asia/Kolkata unless the user
specifies another timezone.

Use ISO 8601 date-time strings with explicit timezone offsets.
Use maxResults 10 by default.

This is a read-only action and does not require approval.
`,

        schema: z.object({
          timeMin: z
            .string()
            .datetime({ offset: true })
            .describe("Start of the requested date range"),

          timeMax: z
            .string()
            .datetime({ offset: true })
            .describe("End of the requested date range"),

          maxResults: z.number().int().min(1).max(50).default(10),
        }),

        func: async ({ timeMin, timeMax, maxResults }) => {
          try {
            const authToken = makeAuthToken(userId);
            const result = await listCalendarEventsMcpTool.invoke({
              authToken,
              timeMin,
              timeMax,
              maxResults,
            });

            return result;
          } catch (error) {
            console.log(error);
          }
        },
      }),
    );
  }

  // INSTAGRAM

  if (publishOnInstagramMcpTool && isToolEnabled("publish_instagram_post")) {
    finalTools.push(
      new DynamicStructuredTool({
        name: "publish_instagram_post",
        description: `
Publish an image to the authenticated user's connected Instagram account.

Use this tool ONLY when the user explicitly requests an Instagram
post or asks to publish an image to Instagram.

Examples:
- Post this image on Instagram.
- Upload this image to my Instagram.
- Publish this image with a caption.

Do NOT use this tool when:
- The user only uploads an image.
- The user asks what an image contains.
- The user asks to explain or analyze an image.
- The user asks to describe an image.


Requirements:
- imageUrl must be a public HTTPS URL.
- Generate a caption if one is not provided.
- The application requires explicit user approval before publishing.
- Never claim success unless publishing is confirmed.
`,

        schema: z.object({
          imageUrl: z
            .string()
            .url()
            .refine((url) => url.startsWith("https://"), {
              message: "Image URL must use HTTPS",
            })
            .refine(
              (url) => {
                try {
                  const { pathname } = new URL(url);
                  return /\.(jpe?g|png|webp|bmp)$/i.test(pathname);
                } catch {
                  return false;
                }
              },
              {
                message:
                  "Image URL must be a direct JPEG, PNG, WEBP, or BMP image link",
              },
            )
            .describe("Direct public HTTPS image URL"),

          caption: z
            .string()
            .trim()
            .max(2200)
            .optional()
            .describe("Optional Instagram caption"),
        }),

        func: async ({ imageUrl, caption }) => {
          try {
            const authToken = makeAuthToken(userId);
            let finalCaption = caption?.trim() || "";

            if (!finalCaption) {
              try {
                finalCaption = await generatedCaption(imageUrl);
              } catch (error) {
                console.error("Gemini caption generation failed:", error);
                finalCaption =
                  "Good morning! ☀️ Have a wonderful day! #GoodMorning #PositiveVibes";
              }
            }

            if (!finalCaption?.trim()) {
              finalCaption =
                "Good morning! ☀️ Have a wonderful day! #GoodMorning #PositiveVibes";
            }

            const result = await publishOnInstagramMcpTool.invoke({
              authToken,
              imageUrl,
              caption: finalCaption.trim(),
            });

            return result;
          } catch (error) {
            console.error("Instagram publishing tool failed:", error);
            throw error;
          }
        },
      }),
    );
  }

  const llmWithTools = llm.bindTools(finalTools);

  const currentDateTime = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "long",
  }).format(new Date());

  const systemPrompt = `
${agent.instructions || "You are AutoMate AI, a helpful personal assistant."}

CURRENT DATE AND TIME:
- Current date and time in Asia/kolkata: ${currentDateTime}
- Resolve today, tomorrow, and weekday references using this timestamp.
- Do not ask the user to confirm a date that can be resolved.

DEFAULT SETTINGS:
- Timezone: Asia/Kolkata.
- Default calendar event duration: 30 minutes.
- Infer meaningful event titles.
- Ask only for essential missing information.
- Never fabricate tool results.

IMPORTANT ACTION RULE:
- When the user directly requests an action, call the relevant tool.
- The application handles approval through an approval card.
- Do not ask for approval in your chat response.
- Never claim an action succeeded unless the tool confirms success.

EMAIL SENDING RULES:
1. Call send_email when the required details are available.
2. Ask for the recipient only when it is missing and cannot be inferred.
3. Never ask for passwords, tokens, API keys, or user IDs.
4. The application requests approval before sending.
5. Never claim an email was sent without tool confirmation.

CALENDAR RULES:
1. Call create_calendar_event when sufficient details are available.
2. Do not ask "Would you like me to create it?"
3. Resolve relative dates using the current date above.
4. Default duration is 30 minutes.
5. Use ISO 8601 date-time strings with an explicit timezone offset.
6. Set timeZone to "Asia/Kolkata".
7. Ask a follow-up only when an essential detail is missing.
8. Use list_calendar_events to retrieve existing events.
9. Never claim an event was created without tool confirmation.

GMAIL EMAIL READING RULES:
1. Use list_emails when the user asks to see or search emails.
2. Use "in:inbox" for the latest inbox emails.
3. Use "is:unread" for unread emails.
4. Use Gmail search syntax for sender and subject searches.
5. If the user asks to read a specific email, first call list_emails to retrieve the email details.
6. If its message ID is unknown, call list_emails first.
7. Summarize actual retrieved email content.
8. Never invent email content.
9. Reading and searching emails are read-only.
10.Use list_emails for email retrieval. Do not call read_email because it is not currently an available tool.

INSTAGRAM PUBLISHING RULES:
1. If the latest user message asks to post, publish, share or upload an
   image to Instagram, call publish_instagram_post IMMEDIATELY.
   This applies even if the user also asks for a caption.
2. Take imageUrl from the "Image URL:" line of the latest user message.
3. If the user gave no caption, omit the caption argument. The app
   generates the caption and shows it on an approval card.
4. NEVER write a caption in chat and ask "should I publish?".
   NEVER ask for confirmation in chat. The app shows the approval card.
5. Do not call analyze_image first when the user clearly wants to
   publish. Pass topic and imageDescription only if the user gave them.
6. If the user only uploads an image, or only asks for a caption,
   description or analysis, do NOT publish.
7. If the user says "don't post" or "only caption", do not publish.
8. If publishing is requested but there is no "Image URL:" in the
   message, ask the user to upload the image first.
9. Never claim a post was published without tool confirmation.

IMAGE ANALYSIS RULES:
1. If the user uploads an image or asks a question about an image,
   use analyze_image when the image URL is available.
2. If the user uploads an image without a question, analyze it and
   provide a useful description.
3. Answer image-related questions using the actual analysis.
4. Never call publish_instagram_post for image analysis or description.
5. Never suggest publishing solely because an image was uploaded.
6. Keep image analysis and Instagram publishing as separate actions.
7. If image analysis fails, explain the failure honestly.
8. Never claim to have viewed an image if analysis failed.

AVAILABLE TOOLS RULES:
-You can only use tools provided to you through blindly.
-Never attempt to use tools that are not available in the current context.
-if a user asks you to use a tool that is not available, inform them that the tool is not available and suggest alternative actions or tools that can be used instead.
-never pretend to execute a tool that is not available or provide false information about its capabilities.


GENERAL RULES:
- Be concise and helpful.
- Infer parameters when sufficient context is available.
- Never substitute a natural-language promise for a tool call.
- Ask questions only when essential information is missing.


`;

  const approvalToolNames = new Set([
    "send_email",
    "create_calendar_event",
    "publish_instagram_post",
  ]);

  const chatNode = async (state) => {
    const toolNamesByCallId = new Map();
    for (const message of state.messages) {
      for (const call of message.tool_calls || []) {
        if (call.id && call.name) {
          toolNamesByCallId.set(call.id, call.name);
        }
      }
    }

    const recentMessages = state.messages.slice(-4).map((message) => {
      if (
        (message instanceof ToolMessage || message.type === "tool") &&
        !message.name
      ) {
        const name = toolNamesByCallId.get(message.tool_call_id);
        if (!name) {
          throw new Error(
            `Tool response ${message.tool_call_id || "(unknown)"} has no matching tool name.`,
          );
        }
        message = new ToolMessage({ ...message, name });
      }

      return limitMessageContext(message);
    });

    const response = await llmWithTools.invoke([
      new SystemMessage(systemPrompt),
      ...recentMessages,
    ]);
    return {
      messages: [response],
    };
  };

  const toolNode = new ToolNode(finalTools);

  const actionApprovalNode = async (state) => {
    const lastMessage = state.messages[state.messages.length - 1];

    const tool_calls = lastMessage?.tool_calls || [];

    if (tool_calls.length !== 1 || !approvalToolNames.has(tool_calls[0].name)) {
      return {
        messages: tool_calls.map(
          (call) =>
            new ToolMessage({
              name: call.name,
              tool_call_id: call.id,
              content: JSON.stringify({
                success: false,
                message:
                  "Please request one approval-protected action at a time.",
              }),
            }),
        ),
      };
    }

    const actionCall = tool_calls[0];
    const args = actionCall.args || {};

    if (actionCall.name === "send_email") {
      const { to, subject, body } = args;

      if (
        typeof to !== "string" ||
        typeof subject !== "string" ||
        typeof body !== "string" ||
        !to.trim() ||
        !subject.trim() ||
        !body.trim()
      ) {
        return {
          messages: [
            new ToolMessage({
              name: actionCall.name,
              tool_call_id: actionCall.id,
              content: JSON.stringify({
                success: false,
                message: "The email draft is incomplete.",
              }),
            }),
          ],
        };
      }

      const decision = interrupt({
        type: "email_approval",
        tool_call_id: actionCall.id,
        email: {
          to,
          subject,
          body,
        },
        message: "Review the email and approve or reject sending it.",
      });

      if (decision?.approved !== true) {
        return {
          messages: [
            new ToolMessage({
              name: actionCall.name,
              tool_call_id: actionCall.id,
              content: JSON.stringify({
                success: false,
                rejected: true,
                message: "Email rejected. No email was sent.",
              }),
            }),
          ],
        };
      }

      return {};
    }

    if (actionCall.name === "publish_instagram_post") {
      const { imageUrl, caption } = args;

      if (
        typeof imageUrl !== "string" ||
        !imageUrl.trim() ||
        (caption !== undefined && typeof caption !== "string")
      ) {
        return {
          messages: [
            new ToolMessage({
              name: actionCall.name,
              tool_call_id: actionCall.id,
              content: JSON.stringify({
                success: false,
                message:
                  "Invalid Instagram post details . Please provide a public HTML image URL.",
              }),
            }),
          ],
        };
      }

     

      const decision = interrupt({
        type: "instagram_post_approval",
        tool_call_id: actionCall.id,
        imageUrl,
        caption: caption?.trim() || "",
        message: caption?.trim()
          ? "Review the Instagram image and caption, then approve or reject publishing."
          : "Review the Instagram image. A caption will be generated after you approve publishing.",
      });

     
      if (decision?.approved !== true) {
        return {
          messages: [
            new ToolMessage({
              name: actionCall.name,
              tool_call_id: actionCall.id,
              content: JSON.stringify({
                success: false,
                rejected: true,
                message: "Instagram post rejected. Nothing was published.",
              }),
            }),
          ],
        };
      }

      return {};
    }

    if (actionCall.name === "create_calendar_event") {
      const {
        summary,
        description,
        startDateTime,
        endDateTime,
        timeZone = "Asia/Kolkata",
      } = args;

      const start = new Date(startDateTime);
      const end = new Date(endDateTime);

      if (
        typeof summary !== "string" ||
        !summary.trim() ||
        !startDateTime ||
        !endDateTime ||
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end <= start
      ) {
        return {
          messages: [
            new ToolMessage({
              name: actionCall.name,
              tool_call_id: actionCall.id,
              content: JSON.stringify({
                success: false,
                message:
                  "Calendar event details are invalid. Please clarify the date or time.",
              }),
            }),
          ],
        };
      }

      const decision = interrupt({
        type: "calendar_event_approval",
        tool_call_id: actionCall.id,
        event: {
          summary,
          description: description || "",
          startDateTime,
          endDateTime,
          timeZone,
        },
        message:
          "Review the calendar event and approve or reject its creation.",
      });

      if (decision?.approved !== true) {
        return {
          messages: [
            new ToolMessage({
              name: actionCall.name,
              tool_call_id: actionCall.id,
              content: JSON.stringify({
                success: false,
                rejected: true,
                message: "Calendar event rejected. No event was created.",
              }),
            }),
          ],
        };
      }

      return {};
    }
  };

  const routeAfterChat = (state) => {
    const messages = state.messages || [];
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage?.tool_calls?.length) {
      return "__end__";
    }
    const requiresApproval = lastMessage?.tool_calls?.some((call) =>
      approvalToolNames.has(call.name),
    );

    return requiresApproval ? "actionApprovalNode" : "tools";
  };

  const routeAfterApproval = (state) => {
    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage instanceof ToolMessage) {
      return "chatNode";
    }

    return "tools";
  };
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("chatNode", chatNode)
    .addNode("tools", toolNode)
    .addNode("actionApprovalNode", actionApprovalNode)
    .addEdge("__start__", "chatNode")
    .addConditionalEdges("chatNode", routeAfterChat)
    .addEdge("tools", "chatNode")
    .addConditionalEdges("actionApprovalNode", routeAfterApproval);

  const chatAgentGraph = workflow.compile({ checkpointer });

  return chatAgentGraph;
};

export const resumeAgentGraph = async ({
  agent,
  threadId,
  userId,
  approved,
}) => {
  if (!threadId) {
    throw new Error("threadId is required.");
  }

  if (!userId) {
    throw new Error("Authenticated userId is required.");
  }

  if (typeof approved !== "boolean") {
    throw new Error("approved must be true or false.");
  }

  const graph = await createAgentGraph(agent, userId);

  const result = await graph.invoke(
    new Command({
      resume: {
        approved,
      },
    }),
    {
      configurable: {
        thread_id: threadId,
      },

      recursionLimit: 15,
    },
  );
  const lastMessage = result.messages.at(-1).content;

  return {
    aiMessage: lastMessage,
    interrupted: Boolean(result.__interrupt__?.length),
    interrupts: (result.__interrupt__ || []).map((item) => ({
      id: item.id,
      value: item.value,
    })),
  };
};


