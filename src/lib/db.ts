import "server-only";
// Node 22 ships a local SQLite driver. It keeps this workshop dependency-light.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

let database: DatabaseSync | undefined;

function db() {
  if (!database) {
    database = new DatabaseSync(process.env.DATABASE_PATH ?? path.join(process.cwd(), "tradify.db"));
    database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id)
      );
    `);
  }
  return database;
}

export type DbUser = { id: number; email: string; password_hash: string };
const numericId = (value: bigint | number) => Number(value);

export function findUser(email: string) {
  return db().prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email) as DbUser | undefined;
}

export function createUser(email: string, passwordHash: string) {
  const result = db().prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(email, passwordHash);
  return numericId(result.lastInsertRowid);
}

export function createConversation(userId: number, title = "New market research") {
  const result = db().prepare("INSERT INTO conversations (user_id, title) VALUES (?, ?)").run(userId, title);
  return numericId(result.lastInsertRowid);
}

export function listConversations(userId: number) {
  return db().prepare("SELECT id, title, updated_at AS updatedAt FROM conversations WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as { id: number; title: string; updatedAt: string }[];
}

export function conversationBelongsToUser(id: number, userId: number) {
  return Boolean(db().prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?").get(id, userId));
}

export function getMessages(conversationId: number) {
  return db().prepare("SELECT id, role, content, created_at AS createdAt FROM messages WHERE conversation_id = ? ORDER BY id ASC").all(conversationId) as { id: number; role: "user" | "assistant"; content: string; createdAt: string }[];
}

export function addMessage(conversationId: number, role: "user" | "assistant", content: string) {
  const result = db().prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)").run(conversationId, role, content);
  db().prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conversationId);
  return numericId(result.lastInsertRowid);
}

export function setConversationTitle(conversationId: number, title: string) {
  db().prepare("UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(title, conversationId);
}
