import dotenv from "dotenv";

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  publicBaseUrl: required("PUBLIC_BASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
  robloxClientId: required("ROBLOX_CLIENT_ID"),
  robloxClientSecret: required("ROBLOX_CLIENT_SECRET"),
  robloxRedirectUri: required("ROBLOX_REDIRECT_URI"),
  discordBotToken: process.env.DISCORD_BOT_TOKEN || "",
  discordClientId: process.env.DISCORD_CLIENT_ID || "",
  discordEnableGuildMembersIntent: process.env.DISCORD_ENABLE_GUILD_MEMBERS_INTENT === "true",
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || ""
};
