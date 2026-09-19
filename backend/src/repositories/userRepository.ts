import { randomUUID } from "node:crypto";
import { db } from "../db/connection.js";
import type { Role } from "../types/index.js";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: Role;
  is_active: number | boolean;
  loyalty_points: number;
  created_at: string;
}

export const userRepository = {
  async findByEmail(email: string): Promise<UserRow | undefined> {
    return db<UserRow>("users").where({ email: email.toLowerCase() }).first();
  },

  async findById(id: string): Promise<UserRow | undefined> {
    return db<UserRow>("users").where({ id }).first();
  },

  async create(input: { email: string; passwordHash: string; name: string; role: Role }): Promise<UserRow> {
    const row: UserRow = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      password_hash: input.passwordHash,
      name: input.name,
      role: input.role,
      is_active: true,
      loyalty_points: 0,
      created_at: new Date().toISOString(),
    };
    await db("users").insert(row);
    return row;
  },

  /**
   * Writes a profile-mirror row keyed by an externally-issued id (Cognito
   * `sub`) rather than generating one locally — used only when AUTH_PROVIDER
   * is Cognito, so `orders.customer_id` FKs and staff-listing queries keep
   * working without the app owning real credentials. No-ops if the row
   * already exists (register()/adminCreateUser() are the only callers, each
   * a one-time event per user).
   */
  async upsertProfileMirror(input: { id: string; email: string; name: string; role: Role }): Promise<void> {
    const existing = await db<UserRow>("users").where({ id: input.id }).first();
    if (existing) return;
    const row: UserRow = {
      id: input.id,
      email: input.email.toLowerCase(),
      password_hash: "cognito-managed", // never used for auth once AUTH_PROVIDER=cognito
      name: input.name,
      role: input.role,
      is_active: true,
      loyalty_points: 0,
      created_at: new Date().toISOString(),
    };
    await db("users").insert(row);
  },

  async listByRole(role: Role): Promise<UserRow[]> {
    return db<UserRow>("users").where({ role }).orderBy("created_at", "desc");
  },

  async update(id: string, patch: Partial<Pick<UserRow, "name" | "role" | "is_active">>): Promise<void> {
    await db("users").where({ id }).update(patch);
  },

  async delete(id: string): Promise<void> {
    await db("users").where({ id }).delete();
  },

  async getPoints(id: string): Promise<number> {
    const row = await db<UserRow>("users").where({ id }).first("loyalty_points");
    return row?.loyalty_points ?? 0;
  },

  /** Atomic increment/decrement via SQL, not a read-then-write round trip. */
  async adjustPoints(id: string, delta: number): Promise<void> {
    if (delta === 0) return;
    if (delta > 0) {
      await db("users").where({ id }).increment("loyalty_points", delta);
    } else {
      await db("users").where({ id }).decrement("loyalty_points", -delta);
    }
  },
};
