import type { WsEvent } from "../types/index.js";

export interface PublishTarget {
  customerId?: string;
  tableSessionId?: string;
}

export interface EventPublisher {
  publish(event: WsEvent, target?: PublishTarget): Promise<void>;
}
