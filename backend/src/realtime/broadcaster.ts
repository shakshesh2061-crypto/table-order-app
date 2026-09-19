import type { WebSocket } from "ws";
import type { WsEvent } from "../types/index.js";
import type { EventPublisher, PublishTarget } from "./eventPublisher.js";

export interface Subscriber {
  socket: WebSocket;
  role: "customer" | "staff" | "admin";
  customerId?: string;
  tableSessionId?: string;
}

const subscribers = new Set<Subscriber>();

export function addSubscriber(sub: Subscriber): void {
  subscribers.add(sub);
}

export function removeSubscriber(sub: Subscriber): void {
  subscribers.delete(sub);
}

/**
 * Staff/admin sockets receive every event. Customer sockets only receive
 * events relevant to their own order/table session. Used by the local `ws`
 * server (backend/src/realtime/wsServer.ts) — an in-memory Set only works
 * within a single long-running process, which is why the Lambda deployment
 * uses dynamoEventPublisher instead (see Phase D / RealtimeStack).
 */
function publishLocally(event: WsEvent, target?: PublishTarget): void {
  const payload = JSON.stringify(event);
  for (const sub of subscribers) {
    if (sub.socket.readyState !== sub.socket.OPEN) continue;

    const isStaffOrAdmin = sub.role === "staff" || sub.role === "admin";
    const matchesCustomer = target?.customerId && sub.customerId === target.customerId;
    const matchesSession = target?.tableSessionId && sub.tableSessionId === target.tableSessionId;

    if (isStaffOrAdmin || matchesCustomer || matchesSession || !target) {
      sub.socket.send(payload);
    }
  }
}

export const localEventPublisher: EventPublisher = {
  async publish(event, target) {
    publishLocally(event, target);
  },
};
