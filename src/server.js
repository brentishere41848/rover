import cookieParser from "cookie-parser";
import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { config } from "./config.js";
import { randomString } from "./crypto.js";
import {
  appSessions,
  deleteAppSession,
  oauthStates,
  pendingLinks,
  saveAppSession,
  saveLinkedRecord
} from "./store.js";
import {
  buildAuthorizationRequest,
  exchangeCodeForTokens,
  fetchRobloxAvatar,
  fetchRobloxUserInfo
} from "./roblox.js";
import { sendAuthWebhook } from "./webhook.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");

app.use(express.json());
app.use(cookieParser(config.sessionSecret));
app.use(express.static(publicDir));

function getSession(req) {
  const sessionId = req.signedCookies.rover_session;
  if (!sessionId) {
    return null;
  }
  return appSessions.get(sessionId) || null;
}

function persistSession(res, data) {
  const sessionId = randomString(24);
  saveAppSession(sessionId, data);
  res.cookie("rover_session", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.publicBaseUrl.startsWith("https://"),
    signed: true,
    maxAge: 1000 * 60 * 60 * 12
  });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/session", (req, res) => {
  const session = getSession(req);
  res.json({ authenticated: Boolean(session), user: session?.user || null, discord: session?.discord || null });
});

app.get("/link/:token", (req, res) => {
  const pendingLink = pendingLinks.get(req.params.token);
  if (!pendingLink) {
    return res.status(404).sendFile(path.join(publicDir, "invalid-link.html"));
  }

  return res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/auth/roblox", (req, res) => {
  const { url, state, nonce, codeVerifier } = buildAuthorizationRequest();
  const linkToken = typeof req.query.linkToken === "string" ? req.query.linkToken : "";
  oauthStates.set(state, {
    nonce,
    codeVerifier,
    linkToken,
    createdAt: Date.now()
  });
  res.redirect(url);
});

app.get("/auth/roblox/callback", async (req, res) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const oauthState = oauthStates.get(state);

    if (!code || !oauthState) {
      return res.status(400).sendFile(path.join(publicDir, "error.html"));
    }

    oauthStates.delete(state);

    const tokenSet = await exchangeCodeForTokens({
      code,
      codeVerifier: oauthState.codeVerifier
    });

    const user = await fetchRobloxUserInfo(tokenSet.access_token);
    const avatarUrl = await fetchRobloxAvatar(user.sub).catch(() => null);

    let discord = null;
    if (oauthState.linkToken) {
      const pendingLink = pendingLinks.get(oauthState.linkToken);
      if (pendingLink) {
        discord = {
          id: pendingLink.discordId,
          tag: pendingLink.discordTag
        };

        const linkedRecord = {
          discordId: pendingLink.discordId,
          discordTag: pendingLink.discordTag,
          robloxId: String(user.sub),
          robloxUsername: user.preferred_username,
          robloxDisplayName: user.name,
          profileUrl: user.profile,
          avatarUrl,
          linkedAt: new Date().toISOString()
        };

        saveLinkedRecord(linkedRecord);
        pendingLinks.delete(oauthState.linkToken);
      }
    }

    persistSession(res, {
      user: {
        id: String(user.sub),
        username: user.preferred_username,
        displayName: user.name,
        profileUrl: user.profile,
        avatarUrl
      },
      discord
    });

    await sendAuthWebhook(user, {
      discordId: discord?.id,
      discordTag: discord?.tag,
      avatarUrl
    }).catch((error) => {
      console.error(error);
    });

    return res.redirect("/dashboard.html");
  } catch (error) {
    console.error(error);
    return res.status(500).sendFile(path.join(publicDir, "error.html"));
  }
});

app.post("/api/logout", (req, res) => {
  const sessionId = req.signedCookies.rover_session;
  if (sessionId) {
    deleteAppSession(sessionId);
  }
  res.clearCookie("rover_session");
  res.status(204).end();
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Unexpected server error" });
});

app.listen(config.port, () => {
  console.log(`Web app listening on ${config.publicBaseUrl}`);
});
