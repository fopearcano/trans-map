import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type TransMapDb = BetterSQLite3Database<typeof schema>;

export function resolveDbPath(): string {
  return process.env.TRANSMAP_DB_PATH ?? path.join(process.cwd(), "data", "trans-map.db");
}

export function openDatabase(file: string = resolveDbPath()): { db: TransMapDb; sqlite: Database.Database } {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("foreign_keys = ON");
  if (file !== ":memory:") sqlite.pragma("journal_mode = WAL");
  return { db: drizzle(sqlite, { schema }), sqlite };
}

export function runMigrations(db: TransMapDb, migrationsFolder = path.join(process.cwd(), "drizzle")): void {
  migrate(db, { migrationsFolder });
}
