import type { APIGatewayProxyResultV2 } from "aws-lambda";

// Sockets in this app are server-push-only (useOrderSocket.ts never sends
// anything) — API Gateway WebSocket APIs require a $default route to exist
// regardless, so this just acknowledges and does nothing.
export const handler = async (): Promise<APIGatewayProxyResultV2> => {
  return { statusCode: 200, body: "" };
};
