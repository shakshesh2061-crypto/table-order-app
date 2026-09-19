import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { env } from "../config/env.js";
import type { EventPublisher } from "./eventPublisher.js";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.dynamoRegion }));

const ONE_HOUR_SECONDS = 60 * 60;

/**
 * Writes the event to the ws-events table instead of pushing it to sockets
 * directly — this Lambda (the REST API) has no open WebSocket connections
 * of its own. A separate broadcaster Lambda, triggered by this table's
 * DynamoDB Stream, does the actual fan-out via the API Gateway Management
 * API (see infra/lib/realtime-stack.ts). This decouples the transactional
 * write path from WebSocket delivery and lets the broadcaster run outside
 * the VPC (free internet egress) while this Lambda stays VPC-only.
 */
export const dynamoEventPublisher: EventPublisher = {
  async publish(event, target) {
    if (!env.wsEventsTable) throw new Error("WS_EVENTS_TABLE is not configured");

    const now = Math.floor(Date.now() / 1000);
    await client.send(
      new PutCommand({
        TableName: env.wsEventsTable,
        Item: {
          id: randomUUID(),
          type: event.type,
          payload: JSON.stringify(event),
          targetCustomerId: target?.customerId ?? null,
          targetTableSessionId: target?.tableSessionId ?? null,
          createdAt: new Date().toISOString(),
          expiresAt: now + ONE_HOUR_SECONDS,
        },
      })
    );
  },
};
