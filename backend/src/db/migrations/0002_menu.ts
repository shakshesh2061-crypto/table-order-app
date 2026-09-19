import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("categories", (t) => {
    t.string("id").primary();
    t.string("name").notNullable();
    t.integer("sort_order").notNullable().defaultTo(0);
  });

  await knex.schema.createTable("menu_items", (t) => {
    t.string("id").primary();
    t.string("category_id").notNullable().references("id").inTable("categories").onDelete("CASCADE");
    t.string("name").notNullable();
    t.text("description").defaultTo("");
    t.integer("price_cents").notNullable();
    t.string("photo_url").nullable();
    t.boolean("is_available").notNullable().defaultTo(true);
    t.text("addon_groups").notNullable().defaultTo("[]"); // JSON string of AddonGroup[]
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("menu_items");
  await knex.schema.dropTableIfExists("categories");
}
