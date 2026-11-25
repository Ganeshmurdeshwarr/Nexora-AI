import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import jwt from "jsonwebtoken";
import { TavilySearch } from "@langchain/tavily";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Integration from "../models/integration.model.js";
import { decrypt } from "../config/encypt-decrypt.js";
import { google } from "googleapis";
import { connectDB } from "../config/db.js";
import axios from "axios";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});


const server = new McpServer({
  name: "nexora-mcp-server",
  version: "1.0.0",
});

function verifyAuthToken(token) {
  if (!process.env.MCP_AUTH_SECRET) {
    throw new Error("MCP authentication is not configured.");
  }

  if (!token) {
    throw new Error("Missing backend authentication token.");
  }

  const payload = jwt.verify(token, process.env.MCP_AUTH_SECRET, {
    algorithms: ["HS256"],
    issuer: "Nexora_AI_Backend",
    audience: "nexora-mcp",
  });

  return payload.sub;
}

function getHeader(headers = [], name) {
  const header = headers.find(
    (item) => item.name?.toLowerCase() === name.toLowerCase(),
  );

  return header?.value || "";
}

const errorResponse = (message) => ({
  isError: true,
  content: [
    {
      type: "text",
      text: JSON.stringify({
        success: false,
        message,
      }),
    },
  ],
});

const getGoogleOAuthClient = async (userId, requiredService) => {
  await connectDB();

  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_REDIRECT_URI
  ) {
    throw new Error("Google OAuth environment variables are missing.");
  }

  const integration = await Integration.findOne({
    userId,
    provider: "google",
    status: "connected",
    services: requiredService,
  }).select("+tokens.refreshToken");

  if (!integration?.tokens?.refreshToken) {
    throw new Error(
      `Google ${requiredService} is not connected or its refresh token is unavailable.`,
    );
  }

  const refresh_token = decrypt(integration.tokens.refreshToken);

  const oauthClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  oauthClient.setCredentials({ refresh_token });

  return oauthClient;
};

if (!process.env.TAVILY_API_KEY) {
  throw new Error("TAVILY_API_KEY missing. check the backend .env path");
}

const tavilySearch = new TavilySearch({
  maxResults: 5,
  topic: "general",
  tavilyApiKey: process.env.TAVILY_API_KEY,
});

server.registerTool(
  "web_search",
  {
    description: "search the query ion internet using tool.",
    inputSchema: z.object({
      query: z.string(),
    }),
  },
  async ({ query }) => {
    try {
      const result = await tavilySearch.invoke({ query });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get result",
          },
        ],
      };
    }
  },
);

server.registerTool(
  "send_email",
  {
    description:
      "Send an email through the authenticated user's connected Gmail account. Only execute after explicit user approval.",
    inputSchema: z.object({
      authToken: z.string().min(1),
      to: z.string().email(),
      subject: z.string().trim().min(1).max(200),
      body: z.string().trim().min(1).max(20000),
    }),
  },
  async ({ authToken, to, subject, body }) => {
    try {
      const userId = verifyAuthToken(authToken);

      const oauthClient = await getGoogleOAuthClient(userId, "gmail");

      const gmail = google.gmail({
        version: "v1",
        auth: oauthClient,
      });

      const base64Subject = Buffer.from(subject, "utf8").toString("base64");
      const encodedSubject = `=?utf-8?B?${base64Subject}?=`;

      const emailLines = [
        `To: ${to}`,
        `Subject: ${encodedSubject}`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=utf-8",
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(body, "utf8").toString("base64"),
      ];
      const rawEmail = emailLines.join("\r\n");

      const encodedMessage = Buffer.from(rawEmail, "utf8").toString(
        "base64url",
      );

      const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Email sent successfully.",
              messageId: response?.data?.id,
              recipient: to,
              subject,
            }),
          },
        ],
      };
    } catch (error) {
      console.error("send_email failed:", error.message);

      return {
        content: [
          {
            type: "text",
            text: `send email failed, ${error || error.message}`,
          },
        ],
      };
    }
  },
);

server.registerTool(
  "create_calendar_event",
  {
    description: `
Create an event in the authenticated user's primary Google Calendar.

Resolve relative dates using the current date and timezone.
Use a clear, concise event title.
If the user does not specify a duration, use a 30-minute default.
Use Asia/Kolkata as the default timezone unless the user's timezone is known.
Do not invent a meeting time when it is missing.
The backend must obtain authentication from its trusted JWT wrapper.
Only execute after explicit user approval.
`,
    inputSchema: z.object({
      authToken: z.string().min(1),
      summary: z.string().trim().min(1).max(200),
      description: z.string().trim().max(5000).optional(),
      startDateTime: z.string().datetime({ offset: true }),
      endDateTime: z.string().datetime({ offset: true }),
      timeZone: z.string().trim().min(1).default("Asia/Kolkata"),
    }),
  },
  async ({
    authToken,
    summary,
    description,
    startDateTime,
    endDateTime,
    timeZone,
  }) => {
    try {
      const userId = verifyAuthToken(authToken);
      const oauthClient = await getGoogleOAuthClient(userId, "google_calendar");
      const calendar = google.calendar({
        version: "v3",
        auth: oauthClient,
      });

      const start = new Date(startDateTime);
      const end = new Date(endDateTime);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return errorResponse("Invalid event date or time.");
      }

      if (end <= start) {
        return errorResponse(
          "The event end time must be later than its start time.",
        );
      }

      if (start <= new Date()) {
        return errorResponse("The event start time must be in the future.");
      }

      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary,
          ...(description ? { description } : {}),
          start: {
            dateTime: start.toISOString(),
            timeZone,
          },
          end: {
            dateTime: end.toISOString(),
            timeZone,
          },
        },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Calendar event created successfully.",
              event: {
                id: response?.data?.id,
                summary: response?.data?.summary,
                start: response?.data?.start,
                end: response?.data?.end,
                htmlLink: response?.data?.htmlLink,
              },
            }),
          },
        ],
      };
    } catch (error) {
      console.error("create_calendar_event failed:", error.message);

      return {
        content: [
          {
            type: "text",
            text: "create event failed",
          },
        ],
      };
    }
  },
);

server.registerTool(
  "list_emails",
  {
    description: `
List or search emails from the authenticated user's Gmail account.

Examples:
- Latest emails: query "in:inbox"
- Unread emails: query "is:unread"
- Emails from a sender: query "from:rahul@example.com"
- Search by subject: query "subject:invoice"
- Recent emails: query "newer_than:7d"
- Search all mail: query "in:anywhere invoice"

Returns message ID, sender, recipient, subject, date, snippet,
thread ID and unread status.

This tool is read-only and does not require approval.
`,
    inputSchema: z.object({
      authToken: z.string().min(1),

      query: z.string().trim().max(500).default("in:inbox"),

      maxResults: z.number().int().min(1).max(25).default(10),
    }),
  },

  async ({ authToken, query, maxResults }) => {
    try {
      const userId = verifyAuthToken(authToken);

      const oauthClient = await getGoogleOAuthClient(userId, "gmail");

      const gmail = google.gmail({
        version: "v1",
        auth: oauthClient,
      });

      const listResponse = await gmail.users.messages.list({
        userId: "me",
        q: query || "in:inbox",
        maxResults,
      });

      const messageRefs = listResponse?.data?.messages || [];

      const emails = await Promise.all(
        messageRefs.map(async (ref) => {
          const response = await gmail?.users?.messages?.get({
            userId: "me",
            id: ref.id,
            format: "metadata",
            metadataHeaders: ["From", "To", "Subject", "Date"],
          });

          const message = response?.data;
          const headers = message?.payload?.headers || [];

          return {
            id: message?.id,
            threadId: message?.threadId,
            from: getHeader(headers, "From"),
            to: getHeader(headers, "To"),
            subject: getHeader(headers, "Subject") || "(No subject)",
            date: getHeader(headers, "Date"),
            snippet: message?.snippet || "",
            unread: (message?.labelIds || []).includes("UNREAD"),
          };
        }),
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              query: query || "in:inbox",
              count: emails.length,
              nextPageToken: listResponse?.data?.nextPageToken || null,
              emails,
            }),
          },
        ],
      };
    } catch (error) {
      console.error("list_emails failed:", error.message);

      return {
        content: [
          {
            type: "text",
            text: "list emails failed",
          },
        ],
      };
    }
  },
);

server.registerTool(
  "list_calendar_events",
  {
    description: `
Retrieve events from the authenticated user's primary Google Calendar.

Use get_current_time to resolve requests such as today or tomorrow.
Provide timeMin and timeMax as ISO date-time strings with timezone offsets.
For today's meetings, use the beginning and end of today in the user's timezone.
For tomorrow's meetings, use the beginning and end of tomorrow.
Return a maximum of 10 events by default.
This tool only reads events; it does not modify them.
`,
    inputSchema: z.object({
      authToken: z.string().min(1),
      timeMin: z.string().datetime({ offset: true }),
      timeMax: z.string().datetime({ offset: true }),
      maxResults: z.number().int().min(1).max(50).default(10),
    }),
  },
  async ({ authToken, timeMin, timeMax, maxResults }) => {
    try {
      const userId = verifyAuthToken(authToken);

      const start = new Date(timeMin);
      const end = new Date(timeMax);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end <= start
      ) {
        return errorResponse(
          "Invalid calendar date range. The end must be later than the start.",
        );
      }

      const oauthClient = await getGoogleOAuthClient(userId, "google_calendar");

      const calendar = google.calendar({
        version: "v3",
        auth: oauthClient,
      });

      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = (response?.data?.items || []).map((event) => ({
        id: event.id,
        summary: event.summary || "(No title)",
        description: event.description || "",
        start: event.start?.dateTime || event.start?.date || null,
        end: event.end?.dateTime || event.end?.date || null,
        htmlLink: event.htmlLink || null,
        status: event.status,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              count: events?.length,
              events,
            }),
          },
        ],
      };
    } catch (error) {
      console.error("list_calendar_events failed:", error.message);

      return {
        content: [
          {
            type: "text",
            text: "list event failed",
          },
        ],
      };
    }
  },
);
server.registerTool(
  "publish_instagram_post",
  {
    description: `
Publish an image to the authenticated user's connected Instagram account.

Use this tool ONLY when the user explicitly requests an Instagram
post or asks to publish an image to Instagram.

Supported Image Formats:
-JPEG , PNG, WEBP, and BMP fully supported by the meta graph API
-Accept URL links ending in '.webp' seamlessly without raising structural format warnings to user

Examples:
- Post this image on Instagram.
- Upload this image to my Instagram.
- Publish this image with a caption.

Do NOT use this tool when:
- The user only uploads an image.
- The user asks what an image contains.
- The user asks to explain or analyze an image.
- The user asks to describe an image.

For image understanding, use analyze_image instead.

Requirements:
- imageUrl must be a public HTTPS URL.
- Generate a caption if one is not provided.
- The application requires explicit user approval before publishing.
- Never claim success unless publishing is confirmed.
`,
    inputSchema: z.object({
      authToken: z.string().min(1),
      imageUrl: z.string().url().refine((url) => url.startsWith("https://"), {
          message: "imageUrl must be a public HTTPS URL.",
        }),
      caption: z.string().trim().max(2200).optional(),
      
    }),
  },

  async ({
    authToken,
    imageUrl,
    caption,
  }) => {
    try {


      const userId = verifyAuthToken(authToken);

      await connectDB();
      const integration = await Integration.findOne({
        userId,
        provider:"instagram",
        services: "instagram",
        status:"connected"
      }).select("+tokens.accessToken providerAccountId account.userName tokens.expiresAt")

      if(!integration?.tokens?.accessToken || !integration?.providerAccountId){
        throw new Error(`instagram not connect or its access token is unavailable`)
      }

    const access_token = decrypt(integration?.tokens?.accessToken)
    const graphVersion = process.env.INSTAGRAM_GRAPH_VERSION 
    const graphUrl = `https://graph.facebook.com/${graphVersion}`;

    let finalImageUrl = imageUrl
    if(finalImageUrl.includes("://cloudinary.com") && finalImageUrl.endsWith(".webp")){

  finalImageUrl = finalImageUrl.replace(/\.webp$/, ".jpg")
    }
      

      const imageCheck = await axios.head(finalImageUrl);



      const response = await axios.post(
        `${graphUrl}/${integration?.providerAccountId}/media`,
        null,
        {
          params: {
            image_url: finalImageUrl,
            caption:caption || "",
            access_token,
          },
          timeout: 15000
        },
      );

      const creationId = response?.data?.id;

      if (!creationId) {
        throw new Error("Instagram did not return a media container ID.");
      }

      let isReady = false;

      for (let attempt = 0; attempt < 10; attempt++) {
        const statusResponse = await axios.get(
          `${graphUrl}/${creationId}`,
          {
            params: {
              fields: "status_code",
              access_token,
            },
            timeout:15000
          },
        );

        const status = statusResponse?.data?.status_code;

        if (status === "FINISHED") {
          isReady = true;
          break;
        }

        if (status === "ERROR" || status === "EXPIRED") {
          throw new Error(`Instagram media processing failed: ${status}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      if (!isReady) {
        return  {content: [
          {
            type: "text",
            text: "Instagram media processing timeout"
          },
        ],
      }
      }

      const publishResponse = await axios.post(
        `${graphUrl}/${integration.providerAccountId}/media_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token,
          },
        },
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Instagram image published successfully.",
              mediaId: publishResponse?.data?.id || null,
              caption,
            }),
          },
        ],
      };
    } catch (error) {
      return {content: [
          {
            type: "text",
            text: `Instagram publishing failed ${error}`
          },
        ],
      }
    }
  },
);

server.registerTool(
  "analyze_image",
  {
   description: `
Analyze an image using this tool.

Use this tool whenever the user uploads or provides an image
and asks a question about it, or simply wants to know what
the image contains.

Examples:
- What is in this image?
- Describe this image.
- Explain this screenshot.
- Read the text in this image.
- Explain this code screenshot.

IMPORTANT:
- Analyze the image and answer the user's question.
- If the user only uploads an image without a question,
  describe the image and its important visible details.
- Never suggest publishing the image to Instagram unless
  the user explicitly asks to publish or post it.
- This tool only analyzes images. It never publishes them.
`,

    inputSchema: z.object({
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
  },

  async ({ imageUrl, prompt }) => {
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
            apiKey: process.env.GOOGLE_API_KEY,
          });
      
          const message = new HumanMessage({
            content: [
              {
                type: "text",
                text: `${prompt} Describe this image clearly and accurately`,
              },
              {
                type: "image_url",
                image_url: `data:${contentType};base64,${base64Image}`,
              },
            ],
          });
          const response = await imageAnalyzer.invoke([message]);
        
           return{
             content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              result: response?.content,
            }),
          },
        ],
           }
        
    } catch (error) {
      console.error(
        "Gemini image analysis failed:",
        error.response?.data || error.message
      );

      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Image analysis failed: ${error}`
              ,
          },
        ],
      };
    }
  }

);

const main = async () => {
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error(" MCP Server started successfully.");
};

main().catch((error) => {
  console.error("MCP Server error", error);
  process.exit(1);
});
