import { randomUUID } from "node:crypto";
import { db } from "../db/connection.js";

export interface TableRow {
  id: string;
  label: string;
  qr_token: string;
  is_active: number | boolean;
}

export interface TableSessionRow {
  id: string;
  table_id: string;
  session_token: string;
  started_at: string;
  ended_at: string | null;
}

export const tableRepository = {
  async list(): Promise<TableRow[]> {
    return db<TableRow>("tables").orderBy("label", "asc");
  },

  async findById(id: string): Promise<TableRow | undefined> {
    return db<TableRow>("tables").where({ id }).first();
  },

  async findByQrToken(qrToken: string): Promise<TableRow | undefined> {
    return db<TableRow>("tables").where({ qr_token: qrToken }).first();
  },

  async create(label: string): Promise<TableRow> {
    const row: TableRow = { id: randomUUID(), label, qr_token: randomUUID(), is_active: true };
    await db("tables").insert(row);
    return row;
  },

  async update(id: string, patch: Partial<Pick<TableRow, "label" | "is_active">>): Promise<void> {
    await db("tables").where({ id }).update(patch);
  },

  async delete(id: string): Promise<void> {
    await db("tables").where({ id }).delete();
  },

  async findOpenSessionForTable(tableId: string): Promise<TableSessionRow | undefined> {
    return db<TableSessionRow>("table_sessions").where({ table_id: tableId, ended_at: null }).first();
  },

  async findSessionByToken(sessionToken: string): Promise<TableSessionRow | undefined> {
    return db<TableSessionRow>("table_sessions").where({ session_token: sessionToken }).first();
  },

  async createSession(tableId: string): Promise<TableSessionRow> {
    const row: TableSessionRow = {
      id: randomUUID(),
      table_id: tableId,
      session_token: randomUUID(),
      started_at: new Date().toISOString(),
      ended_at: null,
    };
    await db("table_sessions").insert(row);
    return row;
  },

  async closeSession(id: string): Promise<void> {
    await db("table_sessions").where({ id }).update({ ended_at: new Date().toISOString() });
  },

  async listActiveSessionsWithTables(): Promise<Array<TableSessionRow & { table_label: string }>> {
    return db<TableSessionRow & { table_label: string }>("table_sessions")
      .join("tables", "tables.id", "table_sessions.table_id")
      .whereNull("table_sessions.ended_at")
      .select("table_sessions.*", "tables.label as table_label");
  },
};
