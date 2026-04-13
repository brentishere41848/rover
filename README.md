# Safe Roblox Verification Bot

This project implements:

- A Discord bot with `/verify`, `/whois discord`, and `/whois roblox`
- A Roblox OAuth web app using the authorization code flow with PKCE
- A responsive dashboard after successful authentication
- Optional Discord webhook notifications for authentication events

This project does **not** collect `.ROBLOSECURITY`, browser cookies, or any other secrets from end users. Session management uses the app's own secure HTTP-only cookie.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in your Roblox OAuth app credentials and Discord bot settings.
3. Install dependencies with `npm.cmd install`.
4. Start the web app with `npm.cmd run dev`.
5. Start the Discord bot with `npm.cmd run bot`.

## Discord Commands

Slash commands are registered globally, so the bot can work across multiple servers. Discord may take some time to propagate global command updates after deployment.

If you want `/whois discord` to show a server-member dropdown, enable **Server Members Intent** in the Discord Developer Portal and set:

`DISCORD_ENABLE_GUILD_MEMBERS_INTENT=true`

## Roblox OAuth Notes

- Register your app in Roblox Creator Dashboard.
- Use the redirect URI from `ROBLOX_REDIRECT_URI`.
- Include the `openid profile` scopes.

Official references:

- https://create.roblox.com/docs/cloud/auth/oauth2-overview
- https://create.roblox.com/docs/cloud/auth/oauth2-reference
