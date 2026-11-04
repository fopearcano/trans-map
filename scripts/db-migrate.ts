import { openDatabase, resolveDbPath, runMigrations } from "../src/server/db/client";

const file = resolveDbPath();
const { db, sqlite } = openDatabase(file);
runMigrations(db);
sqlite.close();
console.log(`Migrazioni applicate: ${file}`);
