import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { transaction } from "./database.js";
import {
  defaultSettings,
  type Snapshot,
  type Lead,
  type Deal,
  type LeadInput,
  type DealInput,
  type Settings,
} from "../shared.js";
export class Store {
  constructor(readonly pool: Pool) {}
  async event(action: string, client: Pool | PoolClient = this.pool) {
    await client.query(
      "INSERT INTO crm_events(id,action,timestamp) VALUES($1,$2,$3)",
      [randomUUID(), action, new Date().toISOString()],
    );
  }
  async role(userId: string): Promise<"superadmin" | "administrator" | null> {
    const result = await this.pool.query<{
      role: "superadmin" | "administrator" | null;
    }>(
      `SELECT CASE WHEN EXISTS(SELECT 1 FROM crm_superadmins WHERE user_id=$1) THEN 'superadmin'
       WHEN EXISTS(SELECT 1 FROM crm_administrator WHERE user_id=$1) THEN 'administrator' ELSE NULL END AS role`,
      [userId],
    );
    return result.rows[0]?.role ?? null;
  }
  async authorize(userId: string) {
    return (await this.role(userId)) !== null;
  }
  async snapshot(): Promise<Snapshot> {
    const [leads, deals, settings, events] = await Promise.all([
      this.pool.query<{ data: Lead }>(
        "SELECT data FROM crm_leads ORDER BY created_at,id",
      ),
      this.pool.query<{ data: Deal }>(
        "SELECT data FROM crm_deals ORDER BY created_at,id",
      ),
      this.pool.query<{ data: Settings }>(
        "SELECT data FROM crm_settings WHERE id=1",
      ),
      this.pool.query<Snapshot["events"][number]>(
        "SELECT id,action,timestamp FROM crm_events ORDER BY timestamp DESC,id DESC LIMIT 50",
      ),
    ]);
    return {
      leads: leads.rows.map((r) => r.data),
      deals: deals.rows.map((r) => r.data),
      settings: settings.rows[0]?.data ?? defaultSettings,
      events: events.rows.map((e) => ({
        ...e,
        timestamp: new Date(e.timestamp).toISOString(),
      })),
    };
  }
  async save(
    kind: "leads" | "deals",
    input: LeadInput | DealInput,
    id?: string,
  ) {
    return transaction(this.pool, async (client) => {
      const table = kind === "leads" ? "crm_leads" : "crm_deals";
      const old = id
        ? (
            await client.query<{ data: Lead | Deal }>(
              `SELECT data FROM ${table} WHERE id=$1 FOR UPDATE`,
              [id],
            )
          ).rows[0]?.data
        : undefined;
      if (id && !old) throw new Error("Record not found");
      if (
        kind === "deals" &&
        !(
          await client.query(
            "SELECT id FROM crm_leads WHERE id=$1 FOR KEY SHARE",
            [(input as DealInput).leadId],
          )
        ).rowCount
      )
        throw new Error("Select an existing lead");
      const now = new Date().toISOString();
      const data = {
        ...input,
        id: id ?? randomUUID(),
        createdAt: old?.createdAt ?? now,
        updatedAt: now,
      };
      if (kind === "leads")
        await client.query(
          "INSERT INTO crm_leads(id,data,created_at) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
          [data.id, data, data.createdAt],
        );
      else
        await client.query(
          "INSERT INTO crm_deals(id,lead_id,data,created_at) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET lead_id=excluded.lead_id,data=excluded.data",
          [data.id, (input as DealInput).leadId, data, data.createdAt],
        );
      await this.event(
        `${old ? "Updated" : "Created"} ${kind === "leads" ? "lead" : "deal"}: ${kind === "leads" ? (input as LeadInput).name : (input as DealInput).title}`,
        client,
      );
      return data;
    });
  }
  async remove(kind: "leads" | "deals", id: string) {
    try {
      await transaction(this.pool, async (client) => {
        const table = kind === "leads" ? "crm_leads" : "crm_deals";
        const result = await client.query(`DELETE FROM ${table} WHERE id=$1`, [
          id,
        ]);
        if (!result.rowCount) throw new Error("Record not found");
        await this.event(
          `Deleted ${kind === "leads" ? "lead" : "deal"} ${id}`,
          client,
        );
      });
    } catch (error) {
      if (
        kind === "leads" &&
        ["23503", "23001"].includes((error as { code?: string }).code ?? "")
      )
        throw new Error("Delete linked deals before deleting this lead", {
          cause: error,
        });
      throw error;
    }
  }
  async settings(input: Settings) {
    await transaction(this.pool, async (client) => {
      await client.query("UPDATE crm_settings SET data=$1 WHERE id=1", [input]);
      await this.event("Updated workspace settings", client);
    });
  }
}
