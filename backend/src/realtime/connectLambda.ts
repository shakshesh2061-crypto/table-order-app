import type { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import jwt from "jsonwebtoken";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { env } from "../config/env.js";
import { tableRepository } from "../repositories/tableRepository.js";
import type { AuthUser } from "../types/index.js";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.dynamoRegion }));

/**
 * Mirrors the auth logic in wsServer.ts (the local `ws` server): a JWT
 * (?token=) authenticates staff/admin/logged-in customers; a table session
 * token (?sessionToken=) authenticates guest customers via an RDS lookup.
 * Verified with jsonwebtoken directly (not activeAuthProvider) since the
 * deployed app runs AUTH_PROVIDER=local — see api-stack.ts for why Cognito
 * isn't wired into this deployment.
 */
export const handler = async (event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;
  const token = event.queryStringParameters?.token;
  const sessionToken = event.queryStringParameters?.sessionToken;

  let role: "customer" | "staff" | "admin" | undefined;
  let customerId: string | undefined;
  let tableSessionId: string | undefined;

  if (token) {
    try {
      const decoded = jwt.verify(token, env.jwtSecret) as AuthUser;
      role = decoded.role;
      customerId = decoded.id;
    } catch {
      // fall through — try sessionToken next, or reject below
    }
  }

  if (!role && sessionToken) {
    const session = await tableRepository.findSessionByToken(sessionToken);
    if (session) {
      role = "customer";
      tableSessionId = session.id;
    }
  }

  if (!role) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  await ddb.send(
    new PutCommand({
      TableName: env.wsConnectionsTable,
      Item: {
        connectionId,
        role,
        customerId: customerId ?? null,
        tableSessionId: tableSessionId ?? null,
        connectedAt: new Date().toISOString(),
      },
    })
  );

  return { statusCode: 200, body: "Connected" };
};
