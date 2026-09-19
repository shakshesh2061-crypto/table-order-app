import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("menu_items", (t) => {
    t.integer("discount_percent").notNullable().defaultTo(0);
    t.boolean("is_recommended").notNullable().defaultTo(false);
    t.boolean("is_set").notNullable().defaultTo(false);
    t.text("set_items").notNullable().defaultTo("[]"); // JSON: [{ menu_item_id, quantity }]
  });

  await knex.schema.alterTable("users", (t) => {
    t.integer("loyalty_points").notNullable().defaultTo(0);
  });

  await knex.schema.alterTable("orders", (t) => {
    t.integer("points_earned").notNullable().defaultTo(0);
    t.integer("points_redeemed").notNullable().defaultTo(0);
    t.integer("discount_cents").notNullable().defaultTo(0);
    // subtotal_cents (pre-existing) stays the sum of item prices;
    // total_cents is what was actually charged after the points discount.
    t.integer("total_cents").notNullable().defaultTo(0);
  });

  // Backfill: existing orders had no discount, so total == subtotal.
  await knex("orders").update({ total_cents: knex.ref("subtotal_cents") });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("orders", (t) => {
    t.dropColumn("points_earned");
    t.dropColumn("points_redeemed");
    t.dropColumn("discount_cents");
    t.dropColumn("total_cents");
  });
  await knex.schema.alterTable("users", (t) => {
    t.dropColumn("loyalty_points");
  });
  await knex.schema.alterTable("menu_items", (t) => {
    t.dropColumn("discount_percent");
    t.dropColumn("is_recommended");
    t.dropColumn("is_set");
    t.dropColumn("set_items");
  });
}
