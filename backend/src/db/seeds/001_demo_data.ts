import type { Knex } from "knex";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

export async function seed(knex: Knex): Promise<void> {
  await knex("order_items").del();
  await knex("orders").del();
  await knex("table_sessions").del();
  await knex("tables").del();
  await knex("menu_items").del();
  await knex("categories").del();
  await knex("users").del();

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  await knex("users").insert([
    { id: randomUUID(), email: "admin@demo.com", password_hash: hash("password123"), name: "Ada Admin", role: "admin", is_active: true, created_at: new Date().toISOString() },
    { id: randomUUID(), email: "staff@demo.com", password_hash: hash("password123"), name: "Sam Staff", role: "staff", is_active: true, created_at: new Date().toISOString() },
    { id: randomUUID(), email: "customer@demo.com", password_hash: hash("password123"), name: "Cam Customer", role: "customer", is_active: true, created_at: new Date().toISOString() },
  ]);

  const categories = [
    { id: randomUUID(), name: "Appetizers", sort_order: 0 },
    { id: randomUUID(), name: "Main Courses", sort_order: 1 },
    { id: randomUUID(), name: "Drinks", sort_order: 2 },
    { id: randomUUID(), name: "Desserts", sort_order: 3 },
  ];
  await knex("categories").insert(categories);

  const now = new Date().toISOString();
  const items = [
    { id: randomUUID(), category_id: categories[0].id, name: "Spring Rolls", description: "Crispy vegetable spring rolls with sweet chili sauce.", price_cents: 650, photo_url: null, is_available: true, addon_groups: "[]", created_at: now, updated_at: now },
    { id: randomUUID(), category_id: categories[0].id, name: "Garlic Bread", description: "Toasted baguette with garlic butter and herbs.", price_cents: 500, photo_url: null, is_available: true, addon_groups: "[]", created_at: now, updated_at: now },
    {
      id: randomUUID(),
      category_id: categories[1].id,
      name: "Classic Burger",
      description: "Beef patty, lettuce, tomato, house sauce, toasted bun.",
      price_cents: 1350,
      photo_url: null,
      is_available: true,
      addon_groups: JSON.stringify([
        { name: "Size", required: true, options: [{ label: "Regular", price_cents: 0 }, { label: "Double Patty", price_cents: 350 }] },
        { name: "Add-ons", required: false, options: [{ label: "Extra Cheese", price_cents: 100 }, { label: "Bacon", price_cents: 200 }] },
      ]),
      created_at: now,
      updated_at: now,
    },
    { id: randomUUID(), category_id: categories[1].id, name: "Margherita Pizza", description: "Tomato, mozzarella, basil.", price_cents: 1500, photo_url: null, is_available: true, addon_groups: "[]", created_at: now, updated_at: now },
    { id: randomUUID(), category_id: categories[2].id, name: "Iced Tea", description: "Freshly brewed, lightly sweetened.", price_cents: 350, photo_url: null, is_available: true, addon_groups: "[]", created_at: now, updated_at: now },
    { id: randomUUID(), category_id: categories[2].id, name: "Sparkling Water", description: "500ml bottle.", price_cents: 300, photo_url: null, is_available: true, addon_groups: "[]", created_at: now, updated_at: now },
    { id: randomUUID(), category_id: categories[3].id, name: "Chocolate Lava Cake", description: "Warm cake with a molten center, served with vanilla ice cream.", price_cents: 750, photo_url: null, is_available: true, addon_groups: "[]", created_at: now, updated_at: now },
  ];
  await knex("menu_items").insert(items);

  await knex("tables").insert([
    { id: randomUUID(), label: "Table 1", qr_token: randomUUID(), is_active: true },
    { id: randomUUID(), label: "Table 2", qr_token: randomUUID(), is_active: true },
    { id: randomUUID(), label: "Table 3", qr_token: randomUUID(), is_active: true },
  ]);
}
