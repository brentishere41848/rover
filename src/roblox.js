import { config } from "./config.js";
import { randomString, sha256Base64Url } from "./crypto.js";

const ROBLOX_OAUTH_BASE = "https://apis.roblox.com/oauth";
const ROBLOX_USERS_BASE = "https://users.roblox.com";
const ROBLOX_THUMBNAILS_BASE = "https://thumbnails.roblox.com";

export function buildAuthorizationRequest() {
  const state = randomString(24);
  const nonce = randomString(24);
  const codeVerifier = randomString(64);
  const codeChallenge = sha256Base64Url(codeVerifier);

  const url = new URL(`${ROBLOX_OAUTH_BASE}/v1/authorize`);
  url.searchParams.set("client_id", config.robloxClientId);
  url.searchParams.set("redirect_uri", config.robloxRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return { url: url.toString(), state, nonce, codeVerifier };
}

export async function exchangeCodeForTokens({ code, codeVerifier }) {
  const body = new URLSearchParams({
    client_id: config.robloxClientId,
    client_secret: config.robloxClientSecret,
    grant_type: "authorization_code",
    redirect_uri: config.robloxRedirectUri,
    code,
    code_verifier: codeVerifier
  });

  const response = await fetch(`${ROBLOX_OAUTH_BASE}/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Roblox token exchange failed: ${response.status} ${details}`);
  }

  return response.json();
}

export async function fetchRobloxUserInfo(accessToken) {
  const response = await fetch(`${ROBLOX_OAUTH_BASE}/v1/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Roblox userinfo failed: ${response.status} ${details}`);
  }

  return response.json();
}

export async function lookupRobloxUserByUsername(username) {
  const response = await fetch(`${ROBLOX_USERS_BASE}/v1/usernames/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usernames: [username],
      excludeBannedUsers: false
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Roblox username lookup failed: ${response.status} ${details}`);
  }

  const payload = await response.json();
  return payload.data?.[0] || null;
}

export async function lookupRobloxUserById(userId) {
  const response = await fetch(`${ROBLOX_USERS_BASE}/v1/users/${userId}`);

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Roblox user lookup failed: ${response.status} ${details}`);
  }

  return response.json();
}

export async function fetchRobloxAvatar(userId) {
  const url = new URL(`${ROBLOX_THUMBNAILS_BASE}/v1/users/avatar-headshot`);
  url.searchParams.set("userIds", String(userId));
  url.searchParams.set("size", "180x180");
  url.searchParams.set("format", "Png");
  url.searchParams.set("isCircular", "false");

  const response = await fetch(url);

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Roblox avatar lookup failed: ${response.status} ${details}`);
  }

  const payload = await response.json();
  return payload.data?.[0]?.imageUrl || null;
}
