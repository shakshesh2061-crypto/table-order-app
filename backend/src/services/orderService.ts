import { menuRepository } from "../repositories/menuRepository.js";
import { orderRepository, type OrderWithItems } from "../repositories/orderRepository.js";
import { tableRepository } from "../repositories/tableRepository.js";
import { userRepository } from "../repositories/userRepository.js";
import { activeEventPublisher } from "../realtime/activeEventPublisher.js";
import { effectivePriceCents, POINTS_PER_DOLLAR_EARNED, POINTS_PER_DOLLAR_REDEEMED } from "../types/index.js";
import type { OrderStatus } from "../types/index.js";

interface PlaceOrderInput {
  tableSessionId?: string | null;
  customerId?: string | null;
  specialRequests?: string | null;
  redeemPoints?: number;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    selected_addons?: Array<{ group_name: string; option_label: string; price_cents: number }>;
  }>;
}

export const orderService = {
  async placeOrder(input: PlaceOrderInput): Promise<OrderWithItems> {
    const resolvedItems = [];
    for (const item of input.items) {
      const menuItem = await menuRepository.findItem(item.menu_item_id);
      if (!menuItem) {
        throw new Error(`Menu item ${item.menu_item_id} not found`);
      }
      if (!menuItem.is_available) {
        throw new Error(`${menuItem.name} is currently out of stock`);
      }
      const addonTotal = (item.selected_addons ?? []).reduce((sum, a) => sum + a.price_cents, 0);
      const basePrice = effectivePriceCents(menuItem.price_cents, menuItem.discount_percent);
      resolvedItems.push({
        menu_item_id: menuItem.id,
        name_snapshot: menuItem.name,
        price_cents_snapshot: basePrice + addonTotal,
        quantity: item.quantity,
        selected_addons: item.selected_addons ?? [],
      });
    }

    const subtotalCents = resolvedItems.reduce((sum, i) => sum + i.price_cents_snapshot * i.quantity, 0);

    // Points redemption only applies to logged-in customers — guests have no
    // persistent balance. Redeemed in whole $1 (5-point) increments, capped
    // by both the customer's actual balance and the order subtotal (never
    // going negative or redeeming more than was actually available/used).
    let pointsToRedeem = 0;
    let discountCents = 0;
    if (input.customerId && input.redeemPoints && input.redeemPoints > 0) {
      const balance = await userRepository.getPoints(input.customerId);
      const requested = Math.min(input.redeemPoints, balance);
      const requestedWholeDollars = Math.floor(requested / POINTS_PER_DOLLAR_REDEEMED);
      const maxDollarsFromSubtotal = Math.floor(subtotalCents / 100);
      const dollarsToRedeem = Math.min(requestedWholeDollars, maxDollarsFromSubtotal);
      pointsToRedeem = dollarsToRedeem * POINTS_PER_DOLLAR_REDEEMED;
      discountCents = dollarsToRedeem * 100;
    }

    const chargedCents = subtotalCents - discountCents;
    const pointsEarned = input.customerId ? Math.floor(chargedCents / 100) * POINTS_PER_DOLLAR_EARNED : 0;

    const order = await orderRepository.create({
      table_session_id: input.tableSessionId ?? null,
      customer_id: input.customerId ?? null,
      special_requests: input.specialRequests ?? null,
      items: resolvedItems,
      points_earned: pointsEarned,
      points_redeemed: pointsToRedeem,
      discount_cents: discountCents,
    });

    if (input.customerId) {
      const netPointsChange = pointsEarned - pointsToRedeem;
      await userRepository.adjustPoints(input.customerId, netPointsChange);
    }

    await activeEventPublisher.publish(
      { type: "order.status_changed", orderId: order.id, status: order.status },
      { tableSessionId: order.table_session_id ?? undefined, customerId: order.customer_id ?? undefined }
    );

    return order;
  },

  async advanceStatus(orderId: string, status: OrderStatus): Promise<OrderWithItems> {
    const existing = await orderRepository.findById(orderId);
    if (!existing) {
      throw new Error("Order not found");
    }
    await orderRepository.updateStatus(orderId, status);
    const updated = await orderRepository.findById(orderId);

    await activeEventPublisher.publish(
      { type: "order.status_changed", orderId, status },
      { tableSessionId: existing.table_session_id ?? undefined, customerId: existing.customer_id ?? undefined }
    );

    return updated!;
  },

  async reorder(orderId: string, customerId: string): Promise<OrderWithItems> {
    const original = await orderRepository.findById(orderId);
    if (!original) {
      throw new Error("Order not found");
    }
    return this.placeOrder({
      customerId,
      items: original.items.map((item) => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        selected_addons: JSON.parse(item.selected_addons),
      })),
    });
  },
};

export const tableSessionService = {
  async resolveOrCreate(qrToken: string) {
    const table = await tableRepository.findByQrToken(qrToken);
    if (!table || !table.is_active) {
      throw new Error("Table not found or inactive");
    }
    const existing = await tableRepository.findOpenSessionForTable(table.id);
    if (existing) return { table, session: existing };
    const session = await tableRepository.createSession(table.id);
    return { table, session };
  },
};
