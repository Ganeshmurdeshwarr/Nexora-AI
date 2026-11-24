
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import axios from "axios";
import {
  googleOAuthClient,
  scopes,
} from "../config/googleOAuth.js";

import { encrypt } from "../config/encypt-decrypt.js";
import Integration from "../models/integration.model.js";

// Connect Google account
export const connectGoogle = async (req, res) => {
  try {
  
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const state = jwt.sign(
      {
        userId:userId,
        purpose: "google-oauth",
      },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    const url = googleOAuthClient.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
      state,
    });

    return res.status(200).json({
      success: true,
      url,
    });
  } catch (error) {
    console.error("Connect Google:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to connect Google",
    });
  }
};

// Google OAuth callback
export const googleCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send("Google authorization was cancelled");
    }

    

    const decoded = jwt.verify(state, process.env.JWT_SECRET);

    if (decoded.purpose !== "google-oauth" || !decoded.userId) {
      return res.status(400).send("Invalid OAuth state");
    }

    const { tokens } = await googleOAuthClient.getToken(code);

    googleOAuthClient.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: "v2",
      auth: googleOAuthClient,
    });

    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.id || !profile.email) {
      return res.status(400).send("Unable to identify Google account");
    }

    const filter = {
      userId: decoded.userId,
      provider: "google",
      providerAccountId: profile.id,
    };

    let connection = await Integration.findOne(filter)
      .select("+tokens.refreshToken +tokens.accessToken");

    if (!connection) {
      connection = new Integration({
        ...filter,
        services: [],
        tokens: {},
      });
    }

    connection.services = [
      ...new Set([
        ...(connection.services || []),
        "gmail",
        "google_calendar",
      ]),
    ];

    connection.account = {
      ...connection.account?.toObject?.(),
      email: profile.email,
      displayName: profile.name || "",
    };

    connection.scopes = tokens.scope
      ? tokens.scope.split(" ")
      : scopes;

    if (tokens.refresh_token) {
      connection.tokens.refreshToken = encrypt(tokens.refresh_token);
    }

    if (tokens.access_token) {
      connection.tokens.accessToken = encrypt(tokens.access_token);
    }

    if (tokens.expiry_date) {
      connection.tokens.expiresAt = new Date(tokens.expiry_date);
    }

    connection.status = "connected";
    connection.connectedAt = new Date();

    await connection.save();

    return res.redirect(
      `${process.env.CLIENT_URL}/integrations?google=connected`
    );
  } catch (error) {
    console.error("Google OAuth callback:", error.message);

    return res.status(500).send(
      "Google connection failed. Please try again."
    );
  }
};




const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const INSTAGRAM_CONFIG_ID = process.env.INSTAGRAM_CONFIG_ID;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI;
const INSTAGRAM_GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || "v23.0";

const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  
];

// Start Instagram OAuth
export const connectInstagram = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    if (
      !INSTAGRAM_APP_ID ||
      !INSTAGRAM_CONFIG_ID ||
      !INSTAGRAM_REDIRECT_URI ||
      !process.env.JWT_SECRET
    ) {
      return res.status(500).json({
        success: false,
        message: "Instagram OAuth environment variables are missing",
      });
    }

    const state = jwt.sign(
      {
        userId:userId,
        purpose: "instagram-oauth",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m",
      }
    );

const params = new URLSearchParams({
  client_id: INSTAGRAM_APP_ID,
  config_id: INSTAGRAM_CONFIG_ID,
  display: "popup",
  override_default_response_type: "true",
  redirect_uri: INSTAGRAM_REDIRECT_URI,
  response_type: "code",
  state,
  prompt: "login",
});

const url = `https://www.facebook.com/dialog/oauth?${params.toString()}`;

    return res.status(200).json({
      success: true,
      url,
    });
  } catch (error) {
    console.error("Connect Instagram:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to connect Instagram",
    });
  }
};

// Instagram OAuth callback
export const instagramCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error(
        "Instagram authorization error:", error
      );

      // return res.redirect(
      //   `${process.env.CLIENT_URL}/?instagram=error`
      // );
    }

  

    const decoded = jwt.verify(state, process.env.JWT_SECRET);

    if (decoded.purpose !== "instagram-oauth" || !decoded.userId) {
      return res.status(400).send("Invalid Instagram OAuth state");
    }


    
const tokenResponse = await axios.get(
  `https://graph.facebook.com/${INSTAGRAM_GRAPH_VERSION}/oauth/access_token?`,{
    params: {
      client_id: INSTAGRAM_APP_ID,
      client_secret:INSTAGRAM_APP_SECRET ,
      redirect_uri: INSTAGRAM_REDIRECT_URI ,
      code,
    },
    timeout: 15000,
  }
);

const userAccessToken = tokenResponse.data.access_token;


const assignedAccounts = await axios.get(
  `https://graph.facebook.com/${INSTAGRAM_GRAPH_VERSION}/me/assigned_instagram_accounts`,
  {
    params: {
      fields: "id,username,access_token,instagram_business_account",
      access_token: userAccessToken,
    },
    timeout: 15000,
  }
);

const instagramAccounts = assignedAccounts?.data?.data || []

if(!instagramAccounts || instagramAccounts.length === 0){
  console.error("No assigned instagram  account for this user")
  return res.redirect(
      `${process.env.CLIENT_URL}/?instagram=error_no_account`
    );
}

const dynamicAccountId = instagramAccounts[0]?.id
if(!dynamicAccountId){
  console.log("Target Account payload layout lacks a valid unique ID property");
  return res.status(400).json({message:'Invalid payload layout from Meta graph mapping parameters'})
}




const profile= await axios.get(
  `https://graph.facebook.com/${INSTAGRAM_GRAPH_VERSION}/${dynamicAccountId}`,
  {
    params: {
      fields: "id,username,name",
      access_token: userAccessToken ,
    },
    timeout: 15000,
  }
);


const filter = {
  userId: decoded.userId,
  provider: "instagram",
  providerAccountId: profile?.data?.id,
};

let connection = await Integration.findOne(filter)
  .select("+tokens.accessToken");

if (!connection) {
  connection = new Integration({
    ...filter,
    services: [],
    tokens: {},
  });
}

connection.services = [
  ...new Set([
    ...(connection.services || []),
   "instagram"
]),
];

connection.account = {
  ...connection.account?.toObject?.(),
  username: profile?.data?.username,
  displayName: profile?.data?.username|| profile?.data?.userName,
};
connection.scopes = INSTAGRAM_SCOPES;

if(userAccessToken){
  connection.tokens.accessToken = encrypt(userAccessToken);
}

  connection.tokens.expiresAt = null;


connection.status = "connected";
connection.connectedAt = new Date();
await connection.save();

    return res.redirect(
      `${process.env.CLIENT_URL}/integrations?instagram=connected`
    );
  } catch (error) {
    console.error(
      "Instagram OAuth callback:",
      error.response?.data || error.message
    );

   
  }
};


// Get connected integrations
export const getIntegrations = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const integrations = await Integration.find({
      userId,
      status: "connected",
    }).select("-tokens");

    const googleConnection = integrations.find(
      (item) => item.provider === "google"
    );

    const instagramConnection = integrations.find(
      (item) => item.provider === "instagram"
    );

    res.status(200).json({
      success: true,
      integrations: {
        gmail: {
          connected: googleConnection?.services?.includes("gmail") || false,
          email: googleConnection?.account?.email || null,
        },
        googleCalendar: {
          connected:
            googleConnection?.services?.includes("google_calendar") || false,
          email: googleConnection?.account?.email || null,
        },
        instagram: {
          connected:
            instagramConnection?.services?.includes("instagram") || false,
          username: instagramConnection?.account?.username || null,
        },
      },
    });
  } catch (error) {
    console.error("Get integrations:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch integrations",
    });
  }
};


export const disconnectGoogle = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const connection = await Integration.findOne({
      userId,
      provider: "google",
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Google account is not connected",
      });
    }

    await Integration.deleteOne({
      userId,
      _id: connection._id,
    });

    return res.status(200).json({
      success: true,
      message: "Google account disconnected successfully",
    });
  } catch (error) {
    console.error("Disconnect Google Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to disconnect Google account",
    });
  }
};

// Disconnect Instagram
export const disconnectInstagram = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const connection = await Integration.findOne({
      userId,
      provider: "instagram",
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Instagram account is not connected",
      });
    }

    await Integration.deleteOne({
      userId,
      _id: connection._id,
    });

    return res.status(200).json({
      success: true,
      message: "Instagram disconnected successfully",
    });
  } catch (error) {
    console.error("Disconnect Instagram:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to disconnect Instagram",
    });
  }
};

// Get Instagram connection status
// export const getInstagramStatus = async (req, res) => {
//   try {
//     const userId = req.user?._id || req.user?.id;

//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         message: "Please login first",
//       });
//     }

//     const connection = await IntegrationConnection.findOne({
//       userId,
//       provider: "instagram",
//       services: "instagram",
//       status: "connected",
//     }).select("-tokens");

//     return res.status(200).json({
//       success: true,
//       instagram: {
//         connected: Boolean(connection),
//         username: connection?.account?.username || null,
//         connectedAt: connection?.connectedAt || null,
//       },
//     });
//   } catch (error) {
//     console.error("Get Instagram status:", error.message);

//     return res.status(500).json({
//       success: false,
//       message: "Unable to fetch Instagram status",
//     });
//   }
// };



