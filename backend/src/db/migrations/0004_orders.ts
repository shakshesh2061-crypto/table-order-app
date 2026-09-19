import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("orders", (t) => {
    t.string("id").primary();
    t.string("table_session_id").nullable().references("id").inTable("table_sessions").onDelete("SET NULL");
    t.string("customer_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    t.string("status").notNullable().defaultTo("received");
    t.text("special_requests").nullable();
    t.integer("subtotal_cents").notNullable().defaultTo(0);
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("order_items", (t) => {
    t.string("id").primary();
    t.string("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    t.string("menu_item_id").notNullable().references("id").inTable("menu_items");
    t.string("name_snapshot").notNullable();
    t.integer("price_cents_snapshot").notNullable();
    t.integer("quantity").notNullable().defaultTo(1);
    t.text("selected_addons").notNullable().defaultTo("[]"); // JSON snapshot
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("order_items");
  await knex.schema.dropTableIfExists("orders");
}
