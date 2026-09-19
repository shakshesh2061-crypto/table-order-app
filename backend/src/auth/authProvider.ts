import type { AuthUser, Role } from "../types/index.js";

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface AdminCreateUserInput {
  email: string;
  password: string;
  name: string;
  role: Role;
}

export interface AuthProvider {
  register(input: RegisterInput): Promise<{ user: AuthUser; token: string }>;
  login(email: string, password: string): Promise<{ user: AuthUser; token: string }>;
  verifyToken(token: string): Promise<AuthUser | null>;
  /** Admin-created staff/admin account (distinct from self-registration, which always assigns "customer"). */
  adminCreateUser(input: AdminCreateUserInput): Promise<AuthUser>;
  /** Removes the account from whatever identity store owns credentials (no-op for the local provider, which has none). */
  deleteUser(email: string): Promise<void>;
}
