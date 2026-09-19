import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  AdminAddUserToGroupCommand,
  AdminInitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import { createLocalJWKSet, jwtVerify } from "jose";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/userRepository.js";
import type { AdminCreateUserInput, AuthProvider, RegisterInput } from "./authProvider.js";
import type { AuthUser, Role } from "../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new CognitoIdentityProviderClient({ region: env.cognitoRegion });

// Verified fully offline against a JWKS fetched once at setup time and
// bundled with the deployment — avoids needing a paid VPC interface
// endpoint just for a VPC-attached Lambda to reach cognito-idp over HTTPS.
const jwks = JSON.parse(readFileSync(path.join(__dirname, "cognito-jwks", "jwks.json"), "utf-8"));
const JWKS = createLocalJWKSet(jwks);

function requirePoolConfig(): { userPoolId: string; clientId: string } {
  if (!env.cognitoUserPoolId || !env.cognitoClientId) {
    throw new Error("COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID are not configured");
  }
  return { userPoolId: env.cognitoUserPoolId, clientId: env.cognitoClientId };
}

function extractRole(claims: Record<string, unknown>): Role {
  const groups = claims["cognito:groups"];
  const role = Array.isArray(groups) ? (groups[0] as Role) : undefined;
  if (!role) throw new Error("User has no assigned role group");
  return role;
}

async function authenticateAndBuildUser(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const { userPoolId, clientId } = requirePoolConfig();

  const authResult = await client.send(
    new AdminInitiateAuthCommand({
      UserPoolId: userPoolId,
      ClientId: clientId,
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      AuthParameters: { USERNAME: email, PASSWORD: password },
    })
  );

  const idToken = authResult.AuthenticationResult?.IdToken;
  if (!idToken) throw new Error("Authentication did not return a token");

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://cognito-idp.${env.cognitoRegion}.amazonaws.com/${userPoolId}`,
  });

  const user: AuthUser = {
    id: payload.sub as string,
    email: payload["email"] as string,
    name: (payload["name"] as string) ?? (payload["email"] as string),
    role: extractRole(payload as Record<string, unknown>),
  };

  return { user, token: idToken };
}

export const cognitoAuthProvider: AuthProvider = {
  async register(input: RegisterInput) {
    const { userPoolId, clientId } = requirePoolConfig();

    try {
      await client.send(
        new SignUpCommand({
          ClientId: clientId,
          Username: input.email,
          Password: input.password,
          UserAttributes: [
            { Name: "email", Value: input.email },
            { Name: "name", Value: input.name },
          ],
        })
      );
    } catch (err) {
      if (err instanceof UsernameExistsException) {
        throw new Error("An account with this email already exists");
      }
      throw err;
    }

    await client.send(new AdminConfirmSignUpCommand({ UserPoolId: userPoolId, Username: input.email }));
    await client.send(
      new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: input.email, GroupName: "customer" })
    );

    const result = await authenticateAndBuildUser(input.email, input.password);
    await userRepository.upsertProfileMirror({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: "customer",
    });
    return result;
  },

  async adminCreateUser(input: AdminCreateUserInput): Promise<AuthUser> {
    const { userPoolId } = requirePoolConfig();

    try {
      await client.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: input.email,
          UserAttributes: [
            { Name: "email", Value: input.email },
            { Name: "email_verified", Value: "true" },
            { Name: "name", Value: input.name },
          ],
          MessageAction: "SUPPRESS",
        })
      );
    } catch (err) {
      if (err instanceof UsernameExistsException) {
        throw new Error("An account with this email already exists");
      }
      throw err;
    }

    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: input.email,
        Password: input.password,
        Permanent: true,
      })
    );
    await client.send(
      new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: input.email, GroupName: input.role })
    );

    const created = await client.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: input.email }));
    const sub = created.UserAttributes?.find((a) => a.Name === "sub")?.Value;
    if (!sub) throw new Error("Cognito did not return a user id");

    const user: AuthUser = { id: sub, email: input.email, name: input.name, role: input.role };
    await userRepository.upsertProfileMirror(user);
    return user;
  },

  async login(email: string, password: string) {
    try {
      return await authenticateAndBuildUser(email, password);
    } catch {
      throw new Error("Invalid email or password");
    }
  },

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const { userPoolId } = requirePoolConfig();
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `https://cognito-idp.${env.cognitoRegion}.amazonaws.com/${userPoolId}`,
      });
      return {
        id: payload.sub as string,
        email: payload["email"] as string,
        name: (payload["name"] as string) ?? (payload["email"] as string),
        role: extractRole(payload as Record<string, unknown>),
      };
    } catch {
      return null;
    }
  },

  async deleteUser(email: string): Promise<void> {
    const { userPoolId } = requirePoolConfig();
    await client.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: email }));
  },
};
