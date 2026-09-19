import { apiFetch } from "../client";
import type { AuthUser } from "../../auth/AuthContext";

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  register: (email: string, password: string, name: string) =>
    apiFetch<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }),

  me: () => apiFetch<{ user: AuthUser }>("/auth/me"),
};
