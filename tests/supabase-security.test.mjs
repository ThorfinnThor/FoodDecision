import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const migrationsDirectory = new URL("../supabase/migrations/", import.meta.url);
const migrationFiles = readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

function createdTables() {
  return migrationFiles.flatMap((file) => {
    const sql = readFileSync(new URL(file, migrationsDirectory), "utf8");
    return [...sql.matchAll(/create table if not exists\s+([a-z_]+)/gi)].map((match) => match[1]);
  });
}

test("protects every Supabase table from direct browser-role access", () => {
  const securityMigration = readFileSync(new URL("0006_secure_public_schema.sql", migrationsDirectory), "utf8");

  for (const table of createdTables()) {
    assert.match(securityMigration, new RegExp(`'${table}'`), `${table} is missing from the protected table list`);
  }
  assert.match(securityMigration, /enable row level security/i);
  assert.match(securityMigration, /revoke all privileges.+anon, authenticated/i);
  assert.match(securityMigration, /alter default privileges[\s\S]+revoke all privileges on tables from anon, authenticated/i);
});
