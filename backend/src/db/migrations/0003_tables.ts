import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("tables", (t) => {
    t.string("id").primary();
    t.string("label").notNullable();
    t.string("qr_token").notNullable().unique();
    t.boolean("is_active").notNullable().defaultTo(true);
  });

  await knex.schema.createTable("table_sessions", (t) => {
    t.string("id").primary();
    t.string("table_id").notNullable().references("id").inTable("tables").onDelete("CASCADE");
    t.string("session_token").notNullable().unique();
    t.timestamp("started_at").notNullable().defaultTo(knex.fn.now());
    t.timestamp("ended_at").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("table_sessions");
  await knex.schema.dropTableIfExists("tables");
}
