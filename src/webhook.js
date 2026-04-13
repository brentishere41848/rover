import { config } from "./config.js";

export async function sendAuthWebhook(user, context = {}) {
  if (!config.discordWebhookUrl) {
    return;
  }

  const embed = {
    title: "Roblox Authentication Completed",
    color: 0xe23a7d,
    fields: [
      { name: "Username", value: user.preferred_username || "Unknown", inline: true },
      { name: "Display Name", value: user.name || "Unknown", inline: true },
      { name: "User ID", value: String(user.sub || "Unknown"), inline: true },
      { name: "Profile", value: user.profile || "Unavailable", inline: false },
      { name: "Linked Discord", value: context.discordTag || "Not linked", inline: true },
      { name: "Linked Discord ID", value: context.discordId || "Not linked", inline: true }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "Safe notification: no Roblox browser cookies or session tokens collected"
    }
  };

  if (context.avatarUrl) {
    embed.thumbnail = { url: context.avatarUrl };
  }

  const response = await fetch(config.discordWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Webhook notification failed: ${response.status} ${details}`);
  }
}
