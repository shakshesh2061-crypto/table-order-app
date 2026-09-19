import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const addonOptionSchema = z.object({
  label: z.string().min(1),
  price_cents: z.number().int().min(0),
});

export const addonGroupSchema = z.object({
  name: z.string().min(1),
  required: z.boolean(),
  options: z.array(addonOptionSchema),
});

export const setItemRefSchema = z.object({
  menu_item_id: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

export const createMenuItemSchema = z.object({
  category_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price_cents: z.number().int().min(0),
  addon_groups: z.array(addonGroupSchema).optional(),
  discount_percent: z.number().int().min(0).max(90).optional(),
  is_recommended: z.boolean().optional(),
  is_set: z.boolean().optional(),
  set_items: z.array(setItemRefSchema).optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1),
  sort_order: z.number().int().optional(),
});

export const selectedAddonSchema = z.object({
  group_name: z.string(),
  option_label: z.string(),
  price_cents: z.number().int().min(0),
});

export const orderItemInputSchema = z.object({
  menu_item_id: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  selected_addons: z.array(selectedAddonSchema).optional(),
});

export const createOrderSchema = z.object({
  table_session_id: z.string().optional().nullable(),
  special_requests: z.string().optional().nullable(),
  items: z.array(orderItemInputSchema).min(1),
  redeem_points: z.number().int().min(0).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["received", "preparing", "ready", "served", "completed", "cancelled"]),
});

export const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["staff", "admin"]),
});

export const updateStaffSchema = z.object({
  name: z.string().optional(),
  role: z.enum(["staff", "admin"]).optional(),
  is_active: z.boolean().optional(),
});

export const createTableSchema = z.object({
  label: z.string().min(1),
});
