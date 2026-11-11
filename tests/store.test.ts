import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../server/store.js";
import { database } from "./helpers.js";
import {
  leadInput,
  dealInput,
  currency,
  metrics,
  type Lead,
  type Deal,
} from "../shared.js";
test("PostgreSQL stores records, enforces relationships, and rolls back failed activity writes", async () => {
  const db = await database();
  const store = new Store(db.pool);
  try {
    const lead = (await store.save("leads", {
      name: "Alice",
      company: "Acme",
      email: "alice@example.com",
      status: "New",
      value: 12345.67,
    })) as Lead;
    const deal = (await store.save("deals", {
      leadId: lead.id,
      title: "Contract",
      stageId: "new",
      value: 12345.67,
      probability: 20,
    })) as Deal;
    await assert.rejects(store.remove("leads", lead.id), /linked deals/);
    await assert.rejects(
      store.save("deals", {
        leadId: "142f8128-6941-42a6-a8c0-07e1ae748e2b",
        title: "Orphan",
        stageId: "new",
        value: 1,
        probability: 1,
      }),
      /existing lead/,
    );
    await store.save(
      "deals",
      {
        leadId: lead.id,
        title: deal.title,
        stageId: "won",
        value: deal.value,
        probability: 100,
      },
      deal.id,
    );
    await store.settings({
      workspaceName: "Acme",
      supportEmail: "",
      appearance: "dark",
    });
    const reopened = new Store(db.pool);
    const snapshot = await reopened.snapshot();
    assert.equal(snapshot.deals[0]?.stageId, "won");
    assert.equal(snapshot.settings.appearance, "dark");
    assert.equal(metrics(snapshot.deals, 30).revenue, 12345.67);
    assert.equal(currency(12345.67), "$12,345.67");
    await db.pool.query(
      "CREATE FUNCTION reject_event() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'activity unavailable'; END; $$ LANGUAGE plpgsql; CREATE TRIGGER reject_event BEFORE INSERT ON crm_events FOR EACH ROW EXECUTE FUNCTION reject_event()",
    );
    await assert.rejects(
      store.save("leads", {
        name: "Fail",
        company: "Acme",
        email: "fail@example.com",
        status: "New",
        value: 1,
      }),
      /activity unavailable/,
    );
    assert.equal((await store.snapshot()).leads.length, 1);
    await db.pool.query("DROP TRIGGER reject_event ON crm_events");
    await store.remove("deals", deal.id);
    await store.remove("leads", lead.id);
    assert.equal((await store.snapshot()).leads.length, 0);
  } finally {
    await db.close();
  }
});
test("shared validation rejects invalid records", () => {
  const lead = {
    name: "A",
    company: "B",
    email: "a@example.com",
    status: "New",
    value: 1,
  };
  assert.equal(leadInput.safeParse({ ...lead, value: -1 }).success, false);
  assert.equal(leadInput.safeParse({ ...lead, email: "bad" }).success, false);
  assert.equal(
    leadInput.safeParse({ ...lead, ownerId: "other" }).success,
    false,
  );
  assert.equal(
    dealInput.safeParse({
      title: "X",
      leadId: "142f8128-6941-42a6-a8c0-07e1ae748e2b",
      stageId: "invalid",
      value: 1,
      probability: 101,
    }).success,
    false,
  );
});
