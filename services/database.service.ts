import * as SQLite from "expo-sqlite";
import { generateSecureId } from "./encryption.service";

const DB_NAME = "vault_x.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

const getDb = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
};

export interface PasswordEntry {
  id: string;
  siteName: string;
  username: string;
  iv: string; // Vector Initialization (Public)
  ciphertext: string; // AES-256 encrypted password (Secret)
  category: string;
  createdAt: number;
  updatedAt: number;
}

export const initDatabase = async (): Promise<void> => {
  try {
    const db = await getDb();

    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS passwords (
        id TEXT PRIMARY KEY NOT NULL,
        siteName TEXT NOT NULL,
        username TEXT NOT NULL,
        iv TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_siteName ON passwords(siteName);
      CREATE INDEX IF NOT EXISTS idx_category ON passwords(category);
    `);

    console.log("[VaultX/DB] SQLite database initialized succesfully.");
  } catch (error) {
    console.error("[VaultX/DB] CRITICAL ERROR initializing SQLite:", error);
    throw error;
  }
};

export const insertPassword = async (
  siteName: string,
  username: string,
  iv: string,
  ciphertext: string,
  category: string = "General",
): Promise<string> => {
  const db = await getDb();
  const id = await generateSecureId();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO passwords (id, siteName, username, iv, ciphertext, category, createdAt, updatedAt) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, siteName, username, iv, ciphertext, category, now, now],
  );

  return id;
};

export const getAllPasswords = async (): Promise<PasswordEntry[]> => {
  const db = await getDb();
  const allRows = await db.getAllAsync<PasswordEntry>(
    `SELECT * FROM passwords ORDER BY siteName ASC`,
  );
  return allRows;
};

export const deletePassword = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`DELETE FROM passwords WHERE id = ?`, [id]);
};

export const updatePassword = async (
  id: string,
  siteName: string,
  username: string,
  iv: string,
  ciphertext: string,
  category: string,
): Promise<void> => {
  const db = await getDb();
  const now = Date.now();

  await db.runAsync(
    `UPDATE passwords
     SET siteName = ?, username = ?, iv = ?, ciphertext = ?, category = ?, updatedAt = ?
     WHERE id = ?`,
    [siteName, username, iv, ciphertext, category, now, id],
  );
};

export default {
  initDatabase,
  insertPassword,
  getAllPasswords,
  deletePassword,
  updatePassword,
};
