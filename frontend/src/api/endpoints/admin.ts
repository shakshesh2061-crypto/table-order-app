import { apiFetch, API_BASE_URL } from "../client";
import type { Category, MenuItem, TableRow } from "../../types";
import type { Role } from "@table-order/shared";

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_active: boolean | number;
  created_at: string;
}

export const adminApi = {
  createCategory: (name: string, sort_order = 0) =>
    apiFetch<Category>("/admin/categories", { method: "POST", body: JSON.stringify({ name, sort_order }) }),
  updateCategory: (id: string, patch: Partial<Category>) =>
    apiFetch<{ ok: true }>(`/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteCategory: (id: string) => apiFetch<{ ok: true }>(`/admin/categories/${id}`, { method: "DELETE" }),

  createMenuItem: (input: Partial<MenuItem>) =>
    apiFetch<MenuItem>("/admin/menu-items", { method: "POST", body: JSON.stringify(input) }),
  updateMenuItem: (id: string, patch: Partial<MenuItem>) =>
    apiFetch<{ ok: true }>(`/admin/menu-items/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteMenuItem: (id: string) => apiFetch<{ ok: true }>(`/admin/menu-items/${id}`, { method: "DELETE" }),
  uploadPhoto: async (id: string, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    const token = localStorage.getItem("table_order_token");
    const res = await fetch(`${API_BASE_URL}/api/admin/menu-items/${id}/photo`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json() as Promise<{ url: string }>;
  },

  listStaff: () => apiFetch<StaffUser[]>("/admin/staff"),
  createStaff: (input: { email: string; password: string; name: string; role: "staff" | "admin" }) =>
    apiFetch<StaffUser>("/admin/staff", { method: "POST", body: JSON.stringify(input) }),
  updateStaff: (id: string, patch: Partial<Pick<StaffUser, "name" | "role" | "is_active">>) =>
    apiFetch<{ ok: true }>(`/admin/staff/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteStaff: (id: string) => apiFetch<{ ok: true }>(`/admin/staff/${id}`, { method: "DELETE" }),

  listTables: () => apiFetch<TableRow[]>("/admin/tables"),
  createTable: (label: string) => apiFetch<TableRow>("/admin/tables", { method: "POST", body: JSON.stringify({ label }) }),
  updateTable: (id: string, patch: Partial<TableRow>) =>
    apiFetch<{ ok: true }>(`/admin/tables/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTable: (id: string) => apiFetch<{ ok: true }>(`/admin/tables/${id}`, { method: "DELETE" }),
  qrImageUrl: (id: string) => `${API_BASE_URL}/api/admin/tables/${id}/qr`,

  dailyOrders: (date?: string) =>
    apiFetch<{ date: string; count: number }>(`/admin/analytics/daily-orders${date ? `?date=${date}` : ""}`),
  revenue: (from?: string, to?: string) =>
    apiFetch<{ revenue_cents: number }>(`/admin/analytics/revenue${from ? `?from=${from}&to=${to}` : ""}`),
  popularItems: (limit = 5) =>
    apiFetch<Array<{ menu_item_id: string; name: string; total_quantity: number }>>(`/admin/analytics/popular-items?limit=${limit}`),
};
