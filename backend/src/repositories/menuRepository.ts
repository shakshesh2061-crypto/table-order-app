import { randomUUID } from "node:crypto";
import { db } from "../db/connection.js";
import type { AddonGroup, SetItemRef } from "../types/index.js";

export interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
}

export interface MenuItemRow {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  photo_url: string | null;
  is_available: number | boolean;
  addon_groups: string; // JSON
  discount_percent: number;
  is_recommended: number | boolean;
  is_set: number | boolean;
  set_items: string; // JSON: SetItemRef[]
  created_at: string;
  updated_at: string;
}

export interface MenuItemInput {
  category_id: string;
  name: string;
  description?: string;
  price_cents: number;
  photo_url?: string | null;
  addon_groups?: AddonGroup[];
  discount_percent?: number;
  is_recommended?: boolean;
  is_set?: boolean;
  set_items?: SetItemRef[];
}

export const menuRepository = {
  async listCategories(): Promise<CategoryRow[]> {
    return db<CategoryRow>("categories").orderBy("sort_order", "asc");
  },

  async createCategory(name: string, sortOrder = 0): Promise<CategoryRow> {
    const row: CategoryRow = { id: randomUUID(), name, sort_order: sortOrder };
    await db("categories").insert(row);
    return row;
  },

  async updateCategory(id: string, patch: Partial<Pick<CategoryRow, "name" | "sort_order">>): Promise<void> {
    await db("categories").where({ id }).update(patch);
  },

  async deleteCategory(id: string): Promise<void> {
    await db("categories").where({ id }).delete();
  },

  async listItems(opts?: { onlyAvailable?: boolean }): Promise<MenuItemRow[]> {
    const query = db<MenuItemRow>("menu_items").orderBy("name", "asc");
    if (opts?.onlyAvailable) query.where({ is_available: true });
    return query;
  },

  async findItem(id: string): Promise<MenuItemRow | undefined> {
    return db<MenuItemRow>("menu_items").where({ id }).first();
  },

  async createItem(input: MenuItemInput): Promise<MenuItemRow> {
    const now = new Date().toISOString();
    const row: MenuItemRow = {
      id: randomUUID(),
      category_id: input.category_id,
      name: input.name,
      description: input.description ?? "",
      price_cents: input.price_cents,
      photo_url: input.photo_url ?? null,
      is_available: true,
      addon_groups: JSON.stringify(input.addon_groups ?? []),
      discount_percent: input.discount_percent ?? 0,
      is_recommended: input.is_recommended ?? false,
      is_set: input.is_set ?? false,
      set_items: JSON.stringify(input.set_items ?? []),
      created_at: now,
      updated_at: now,
    };
    await db("menu_items").insert(row);
    return row;
  },

  async updateItem(id: string, patch: Partial<MenuItemInput & { is_available: boolean }>): Promise<void> {
    const update: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
    if (patch.addon_groups) update.addon_groups = JSON.stringify(patch.addon_groups);
    if (patch.set_items) update.set_items = JSON.stringify(patch.set_items);
    await db("menu_items").where({ id }).update(update);
  },

  async deleteItem(id: string): Promise<void> {
    await db("menu_items").where({ id }).delete();
  },

  async setAvailability(id: string, isAvailable: boolean): Promise<void> {
    await db("menu_items").where({ id }).update({ is_available: isAvailable, updated_at: new Date().toISOString() });
  },
};
