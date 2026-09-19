import { randomUUID } from "node:crypto";
import { db } from "../db/connection.js";
import type { OrderStatus } from "../types/index.js";

export interface OrderRow {
  id: string;
  table_session_id: string | null;
  customer_id: string | null;
  status: OrderStatus;
  special_requests: string | null;
  subtotal_cents: number;
  points_earned: number;
  points_redeemed: number;
  discount_cents: number;
  total_cents: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string;
  name_snapshot: string;
  price_cents_snapshot: number;
  quantity: number;
  selected_addons: string; // JSON
}

export interface NewOrderItemInput {
  menu_item_id: string;
  name_snapshot: string;
  price_cents_snapshot: number;
  quantity: number;
  selected_addons: unknown[];
}

export interface NewOrderInput {
  table_session_id?: string | null;
  customer_id?: string | null;
  special_requests?: string | null;
  items: NewOrderItemInput[];
  points_earned?: number;
  points_redeemed?: number;
  discount_cents?: number;
}

export type OrderWithItems = OrderRow & { items: OrderItemRow[] };

export const orderRepository = {
  async create(input: NewOrderInput): Promise<OrderWithItems> {
    const subtotal = input.items.reduce((sum, item) => sum + item.price_cents_snapshot * item.quantity, 0);
    const discountCents = Math.min(input.discount_cents ?? 0, subtotal);
    const now = new Date().toISOString();
    const order: OrderRow = {
      id: randomUUID(),
      table_session_id: input.table_session_id ?? null,
      customer_id: input.customer_id ?? null,
      status: "received",
      special_requests: input.special_requests ?? null,
      subtotal_cents: subtotal,
      points_earned: input.points_earned ?? 0,
      points_redeemed: input.points_redeemed ?? 0,
      discount_cents: discountCents,
      total_cents: subtotal - discountCents,
      created_at: now,
      updated_at: now,
    };
    const items: OrderItemRow[] = input.items.map((item) => ({
      id: randomUUID(),
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      name_snapshot: item.name_snapshot,
      price_cents_snapshot: item.price_cents_snapshot,
      quantity: item.quantity,
      selected_addons: JSON.stringify(item.selected_addons ?? []),
    }));

    await db.transaction(async (trx) => {
      await trx("orders").insert(order);
      if (items.length > 0) {
        await trx("order_items").insert(items);
      }
    });

    return { ...order, items };
  },

  async findById(id: string): Promise<OrderWithItems | undefined> {
    const order = await db<OrderRow>("orders").where({ id }).first();
    if (!order) return undefined;
    const items = await db<OrderItemRow>("order_items").where({ order_id: id });
    return { ...order, items };
  },

  async listByStatuses(statuses: OrderStatus[]): Promise<OrderWithItems[]> {
    const orders = await db<OrderRow>("orders").whereIn("status", statuses).orderBy("created_at", "asc");
    return attachItems(orders);
  },

  async listAll(): Promise<OrderWithItems[]> {
    const orders = await db<OrderRow>("orders").orderBy("created_at", "desc");
    return attachItems(orders);
  },

  async listByCustomer(customerId: string): Promise<OrderWithItems[]> {
    const orders = await db<OrderRow>("orders").where({ customer_id: customerId }).orderBy("created_at", "desc");
    return attachItems(orders);
  },

  async listBySession(tableSessionId: string): Promise<OrderWithItems[]> {
    const orders = await db<OrderRow>("orders").where({ table_session_id: tableSessionId }).orderBy("created_at", "desc");
    return attachItems(orders);
  },

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await db("orders").where({ id }).update({ status, updated_at: new Date().toISOString() });
  },

  async dailyOrderCount(dateISO: string): Promise<number> {
    // Day-boundary range comparison instead of a SQL date()/::date cast,
    // so this works unchanged against both SQLite (local) and Postgres (RDS).
    const dayStart = new Date(dateISO);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const row = await db("orders")
      .where("created_at", ">=", dayStart.toISOString())
      .where("created_at", "<", dayEnd.toISOString())
      .count<{ count: string }[]>({ count: "*" })
      .first();
    return Number(row?.count ?? 0);
  },

  async revenueBetween(fromISO: string, toISO: string): Promise<number> {
    const row = await db("orders")
      .whereBetween("created_at", [fromISO, toISO])
      .whereNot("status", "cancelled")
      .sum<{ total: number | null }>({ total: "total_cents" })
      .first();
    return Number(row?.total ?? 0);
  },

  async popularItems(limit: number): Promise<Array<{ menu_item_id: string; name: string; total_quantity: number }>> {
    return db("order_items")
      .select("menu_item_id")
      .select(db.raw("name_snapshot as name"))
      .sum<{ menu_item_id: string; name: string; total_quantity: number }[]>({ total_quantity: "quantity" })
      .groupBy("menu_item_id", "name_snapshot")
      .orderBy("total_quantity", "desc")
      .limit(limit);
  },
};

async function attachItems(orders: OrderRow[]): Promise<OrderWithItems[]> {
  if (orders.length === 0) return [];
  const ids = orders.map((o) => o.id);
  const items = await db<OrderItemRow>("order_items").whereIn("order_id", ids);
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }
  return orders.map((order) => ({ ...order, items: itemsByOrder.get(order.id) ?? [] }));
}
