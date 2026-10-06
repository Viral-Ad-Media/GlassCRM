import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import {
  defaultSettings,
  type Snapshot,
  type LeadInput,
  type DealInput,
  type Settings,
} from "../shared.js";
export class Store {
  readonly db: DatabaseSync;
  constructor(filename: string) {
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY CHECK(id=1), email TEXT NOT NULL, password TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, action TEXT NOT NULL, timestamp TEXT NOT NULL);`);
    if (!this.db.prepare("SELECT id FROM records WHERE id=?").get("settings"))
      this.db
        .prepare("INSERT INTO records VALUES (?, ?, ?)")
        .run("settings", "settings", JSON.stringify(defaultSettings));
  }
  event(action: string) {
    this.db
      .prepare("INSERT INTO events VALUES (?, ?, ?)")
      .run(randomUUID(), action, new Date().toISOString());
  }
  private transaction<T>(operation: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  snapshot(): Snapshot {
    const rows = this.db.prepare("SELECT kind, data FROM records").all() as {
      kind: string;
      data: string;
    }[];
    return {
      leads: rows
        .filter((r) => r.kind === "leads")
        .map((r) => JSON.parse(r.data)),
      deals: rows
        .filter((r) => r.kind === "deals")
        .map((r) => JSON.parse(r.data)),
      settings: JSON.parse(rows.find((r) => r.kind === "settings")!.data),
      events: this.db
        .prepare(
          "SELECT * FROM events ORDER BY timestamp DESC, rowid DESC LIMIT 50",
        )
        .all() as Snapshot["events"],
    };
  }
  save(kind: "leads" | "deals", input: LeadInput | DealInput, id?: string) {
    const snapshot = this.snapshot();
    const old = id ? snapshot[kind].find((r) => r.id === id) : undefined;
    if (id && !old) throw new Error("Record not found");
    if (
      kind === "deals" &&
      !snapshot.leads.some((l) => l.id === (input as DealInput).leadId)
    )
      throw new Error("Select an existing lead");
    const data = {
      ...input,
      id: id ?? randomUUID(),
      createdAt: old?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.transaction(() => {
      this.db
        .prepare("INSERT OR REPLACE INTO records VALUES (?, ?, ?)")
        .run(data.id, kind, JSON.stringify(data));
      this.event(
        `${old ? "Updated" : "Created"} ${kind === "leads" ? "lead" : "deal"}: ${kind === "leads" ? (input as LeadInput).name : (input as DealInput).title}`,
      );
    });
    return data;
  }
  remove(kind: "leads" | "deals", id: string) {
    const snapshot = this.snapshot();
    if (!snapshot[kind].some((r) => r.id === id))
      throw new Error("Record not found");
    if (kind === "leads" && snapshot.deals.some((d) => d.leadId === id))
      throw new Error("Delete linked deals before deleting this lead");
    this.transaction(() => {
      this.db
        .prepare("DELETE FROM records WHERE id=? AND kind=?")
        .run(id, kind);
      this.event(`Deleted ${kind === "leads" ? "lead" : "deal"} ${id}`);
    });
  }
  settings(input: Settings) {
    this.transaction(() => {
      this.db
        .prepare("UPDATE records SET data=? WHERE id=?")
        .run(JSON.stringify(input), "settings");
      this.event("Updated workspace settings");
    });
  }
}
