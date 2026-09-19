export type { Role, OrderStatus, AddonGroup, AddonOption, WsEvent, SetItemRef } from "@table-order/shared";
export { effectivePriceCents, POINTS_PER_DOLLAR_EARNED, POINTS_PER_DOLLAR_REDEEMED } from "@table-order/shared";
import type { AddonGroup, SetItemRef } from "@table-order/shared";

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  photo_url: string | null;
  is_available: boolean | number;
  addon_groups: AddonGroup[];
  discount_percent: number;
  is_recommended: boolean | number;
  is_set: boolean | number;
  set_items: SetItemRef[];
}

export interface SelectedAddon {
  group_name: string;
  option_label: string;
  price_cents: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name_snapshot: string;
  price_cents_snapshot: number;
  quantity: number;
  selected_addons: string;
}

export interface Order {
  id: string;
  table_session_id: string | null;
  customer_id: string | null;
  status: import("@table-order/shared").OrderStatus;
  special_requests: string | null;
  subtotal_cents: number;
  points_earned: number;
  points_redeemed: number;
  discount_cents: number;
  total_cents: number;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface TableRow {
  id: string;
  label: string;
  qr_token: string;
  is_active: boolean | number;
}
