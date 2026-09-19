import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";
import { activeAuthProvider } from "../auth/activeAuthProvider.js";
import { tableRepository } from "../repositories/tableRepository.js";
import { addSubscriber, removeSubscriber, type Subscriber } from "./broadcaster.js";

export function attachWsServer(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (socket, request) => {
    const url = new URL(request.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    const sessionToken = url.searchParams.get("sessionToken");

    let sub: Subscriber | null = null;

    if (token) {
      const user = await activeAuthProvider.verifyToken(token);
      if (user) {
        sub = { socket, role: user.role, customerId: user.id };
      }
    }

    if (!sub && sessionToken) {
      const session = await tableRepository.findSessionByToken(sessionToken);
      if (session) {
        sub = { socket, role: "customer", tableSessionId: session.id };
      }
    }

    if (!sub) {
      socket.close(4001, "Unauthorized");
      return;
    }

    addSubscriber(sub);
    socket.on("close", () => removeSubscriber(sub!));
  });
}
