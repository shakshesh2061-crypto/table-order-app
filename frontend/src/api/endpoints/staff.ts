import { apiFetch } from "../client";
import type { Order, OrderStatus } from "../../types";

export const staffApi = {
  orders: (status?: string) => apiFetch<Order[]>(`/staff/orders${status ? `?status=${status}` : ""}`),

  updateStatus: (orderId: string, status: OrderStatus) =>
    apiFetch<Order>(`/staff/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  setAvailability: (itemId: string, isAvailable: boolean) =>
    apiFetch<{ ok: true }>(`/staff/menu-items/${itemId}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ is_available: isAvailable }),
    }),

  tables: () => apiFetch<Array<{ id: string; table_id: string; table_label: string; started_at: string }>>("/staff/tables"),
};
