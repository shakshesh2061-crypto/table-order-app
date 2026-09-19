import { env } from "../config/env.js";
import { localJwtAuthProvider } from "./localJwtAuthProvider.js";
import { cognitoAuthProvider } from "./cognitoAuthProvider.js";
import type { AuthProvider } from "./authProvider.js";

export const activeAuthProvider: AuthProvider =
  env.authProvider === "cognito" ? cognitoAuthProvider : localJwtAuthProvider;
