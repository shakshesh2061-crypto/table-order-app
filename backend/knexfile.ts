import type { Knex } from "knex";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDbPassword } from "./src/config/resolveDbPassword.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrations = {
  directory: path.join(__dirname, "src", "db", "migrations"),
  extension: "ts",
};

const seeds = {
  directory: path.join(__dirname, "src", "db", "seeds"),
  extension: "ts",
};

const sqliteConfig: Knex.Config = {
  client: "better-sqlite3",
  connection: {
    filename: path.join(__dirname, "data", "dev.sqlite3"),
  },
  useNullAsDefault: true,
  migrations,
  seeds,
};

const pgConfig: Knex.Config = {
  client: "pg",
  // A function (optionally async) so the password can be resolved from SSM
  // at connection time in Lambda, rather than baked into a plaintext env var.
  connection: async () => ({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: await resolveDbPassword(),
    ssl: { rejectUnauthorized: false },
  }),
  pool: { min: 0, max: 2 },
  migrations,
  seeds,
};

const config: Knex.Config = process.env.DB_CLIENT === "pg" ? pgConfig : sqliteConfig;

export default config;
