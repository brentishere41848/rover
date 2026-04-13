import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
const dbPath = path.join(dataDir, "links.json");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readDatabase() {
  ensureDataDir();

  if (!fs.existsSync(dbPath)) {
    return { linkedUsers: [], appSessions: [] };
  }

  try {
    const raw = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to read persistence store, using empty state.", error);
    return { linkedUsers: [], appSessions: [] };
  }
}

function writeDatabase() {
  ensureDataDir();

  const payload = {
    linkedUsers: Array.from(linkedUsersByDiscordId.values()),
    appSessions: Array.from(appSessions.entries()).map(([id, session]) => ({ id, ...session }))
  };

  fs.writeFileSync(dbPath, JSON.stringify(payload, null, 2));
}

const db = readDatabase();

export const oauthStates = new Map();
export const pendingLinks = new Map();
export const linkedUsersByDiscordId = new Map(
  db.linkedUsers.map((record) => [record.discordId, record])
);
export const linkedUsersByRobloxId = new Map(
  db.linkedUsers.map((record) => [record.robloxId, record])
);
export const appSessions = new Map(
  db.appSessions.map((session) => [
    session.id,
    {
      user: session.user,
      discord: session.discord
    }
  ])
);

export function saveLinkedRecord(record) {
  linkedUsersByDiscordId.set(record.discordId, record);
  linkedUsersByRobloxId.set(record.robloxId, record);
  writeDatabase();
}

export function saveAppSession(sessionId, session) {
  appSessions.set(sessionId, session);
  writeDatabase();
}

export function deleteAppSession(sessionId) {
  if (appSessions.delete(sessionId)) {
    writeDatabase();
  }
}
