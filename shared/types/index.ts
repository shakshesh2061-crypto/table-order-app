export type Role = "customer" | "staff" | "admin";

export type OrderStatus =
  | "received"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "received",
  "preparing",
  "ready",
  "served",
  "completed",
];

export interface AddonOption {
  label: string;
  price_cents: number;
}

export interface AddonGroup {
  name: string;
  required: boolean;
  options: AddonOption[];
}

export interface WsEvent {
  type: "order.status_changed" | "menu_item.availability_changed";
  [key: string]: unknown;
}

export interface SetItemRef {
  menu_item_id: string;
  quantity: number;
}

export const POINTS_PER_DOLLAR_EARNED = 1;
export const POINTS_PER_DOLLAR_REDEEMED = 5;

export function effectivePriceCents(priceCents: number, discountPercent: number): number {
  if (!discountPercent) return priceCents;
  return Math.round(priceCents * (100 - discountPercent) / 100);
}
