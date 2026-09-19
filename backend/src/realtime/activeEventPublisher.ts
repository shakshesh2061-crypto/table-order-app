import { env } from "../config/env.js";
import { localEventPublisher } from "./broadcaster.js";
import { dynamoEventPublisher } from "./dynamoEventPublisher.js";
import type { EventPublisher } from "./eventPublisher.js";

export const activeEventPublisher: EventPublisher =
  env.realtimePublisher === "dynamodb" ? dynamoEventPublisher : localEventPublisher;
