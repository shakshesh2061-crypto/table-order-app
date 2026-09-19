import { apiFetch } from "../client";
import type { Order, SelectedAddon } from "../../types";

export interface CartLineInput {
  menu_item_id: string;
  quantity: number;
  selected_addons?: SelectedAddon[];
}

export const ordersApi = {
  createTableSession: (qrToken: string) =>
    apiFetch<{ table: { id: string; label: string }; session: { id: string; session_token: string } }>(
      `/tables/${qrToken}/session`,
      { method: "POST" }
    ),

  placeOrder: (input: {
    table_session_id?: string | null;
    special_requests?: string;
    items: CartLineInput[];
    redeem_points?: number;
  }) => apiFetch<Order>("/orders", { method: "POST", body: JSON.stringify(input) }),

  mine: () => apiFetch<Order[]>("/orders/mine"),

  myPoints: () => apiFetch<{ points: number }>("/loyalty/points"),

  bySession: (sessionToken: string) => apiFetch<Order[]>(`/orders/session/${sessionToken}`),

  byId: (id: string, sessionToken?: string | null) =>
    apiFetch<Order>(`/orders/${id}${sessionToken ? `?sessionToken=${sessionToken}` : ""}`),

  reorder: (id: string) => apiFetch<Order>(`/orders/${id}/reorder`, { method: "POST" }),
};
