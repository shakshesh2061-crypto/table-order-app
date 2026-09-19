import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/userRepository.js";
import { hashPassword, verifyPassword } from "./passwordHashing.js";
import type { AdminCreateUserInput, AuthProvider, RegisterInput } from "./authProvider.js";
import type { AuthUser } from "../types/index.js";

const TOKEN_TTL = "12h";

function toAuthUser(row: { id: string; email: string; name: string; role: string }): AuthUser {
  return { id: row.id, email: row.email, name: row.name, role: row.role as AuthUser["role"] };
}

function sign(user: AuthUser): string {
  return jwt.sign(user, env.jwtSecret, { expiresIn: TOKEN_TTL });
}

export const localJwtAuthProvider: AuthProvider = {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new Error("An account with this email already exists");
    }
    const row = await userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash: hashPassword(input.password),
      role: "customer",
    });
    const user = toAuthUser(row);
    return { user, token: sign(user) };
  },

  async login(email: string, password: string) {
    const row = await userRepository.findByEmail(email);
    if (!row || !row.is_active || !verifyPassword(password, row.password_hash)) {
      throw new Error("Invalid email or password");
    }
    const user = toAuthUser(row);
    return { user, token: sign(user) };
  },

  async adminCreateUser(input: AdminCreateUserInput): Promise<AuthUser> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new Error("An account with this email already exists");
    }
    const row = await userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash: hashPassword(input.password),
      role: input.role,
    });
    return toAuthUser(row);
  },

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, env.jwtSecret) as AuthUser;
      return decoded;
    } catch {
      return null;
    }
  },

  async deleteUser(): Promise<void> {
    // No-op: the local provider has no external identity store — the
    // route's userRepository.delete(id) call already removes the only
    // record of this account.
  },
};
