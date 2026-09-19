import type { DynamoDBStreamEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand, GoneException } from "@aws-sdk/client-apigatewaymanagementapi";
import { env } from "../config/env.js";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.dynamoRegion }));

let managementClient: ApiGatewayManagementApiClient | undefined;
function getManagementClient(): ApiGatewayManagementApiClient {
  if (!managementClient) {
    if (!process.env.WS_API_ENDPOINT) throw new Error("WS_API_ENDPOINT is not configured");
    managementClient = new ApiGatewayManagementApiClient({ endpoint: process.env.WS_API_ENDPOINT });
  }
  return managementClient;
}

interface WsEventRecord {
  type: string;
  payload: string;
  targetCustomerId: string | null;
  targetTableSessionId: string | null;
}

interface ConnectionRow {
  connectionId: string;
  role: "customer" | "staff" | "admin";
  customerId: string | null;
  tableSessionId: string | null;
}

/**
 * Triggered by the ws-events DynamoDB Stream (see dynamoEventPublisher.ts,
 * which writes the records this reacts to). Deliberately outside the VPC
 * (no RDS dependency) so it has normal internet egress for free — this is
 * the piece that actually pushes to open WebSocket connections, mirroring
 * broadcaster.ts's local in-memory matching logic (staff/admin get
 * everything; customers get matches on customerId/tableSessionId) but
 * against the ws-connections DynamoDB table instead of an in-memory Set.
 */
export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  const client = getManagementClient();

  // Hobby-scale connection volume — a full table scan per event is fine
  // here; a customerId/tableSessionId GSI would be the natural upgrade if
  // connection counts ever grew large enough to matter.
  const scanResult = await ddb.send(new ScanCommand({ TableName: env.wsConnectionsTable }));
  const connections = (scanResult.Items ?? []) as ConnectionRow[];

  for (const record of event.Records) {
    if (record.eventName !== "INSERT" || !record.dynamodb?.NewImage) continue;

    const image = record.dynamodb.NewImage;
    const wsEvent: WsEventRecord = {
      type: image.type?.S ?? "",
      payload: image.payload?.S ?? "{}",
      targetCustomerId: image.targetCustomerId?.S ?? null,
      targetTableSessionId: image.targetTableSessionId?.S ?? null,
    };

    const matches = connections.filter((c) => {
      if (c.role === "staff" || c.role === "admin") return true;
      if (wsEvent.targetCustomerId && c.customerId === wsEvent.targetCustomerId) return true;
      if (wsEvent.targetTableSessionId && c.tableSessionId === wsEvent.targetTableSessionId) return true;
      return !wsEvent.targetCustomerId && !wsEvent.targetTableSessionId;
    });

    await Promise.all(
      matches.map(async (conn) => {
        try {
          await client.send(
            new PostToConnectionCommand({
              ConnectionId: conn.connectionId,
              Data: Buffer.from(wsEvent.payload),
            })
          );
        } catch (err) {
          if (err instanceof GoneException) {
            await ddb.send(
              new DeleteCommand({ TableName: env.wsConnectionsTable, Key: { connectionId: conn.connectionId } })
            );
          } else {
            throw err;
          }
        }
      })
    );
  }
};
