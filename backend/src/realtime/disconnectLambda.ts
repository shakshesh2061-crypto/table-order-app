import type { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { env } from "../config/env.js";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.dynamoRegion }));

export const handler = async (event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> => {
  await ddb.send(
    new DeleteCommand({
      TableName: env.wsConnectionsTable,
      Key: { connectionId: event.requestContext.connectionId },
    })
  );
  return { statusCode: 200, body: "Disconnected" };
};
