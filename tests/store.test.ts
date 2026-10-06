import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../server/store.js";
import {
  dealInput,
  leadInput,
  currency,
  metrics,
  type Lead,
  type Deal,
} from "../shared.js";
test("saved records survive reopening; linked leads are protected and closed deals affect reports", () => {
  const dir = mkdtempSync(join(tmpdir(), "glasscrm-store-"));
  let store = new Store(join(dir, "test.sqlite"));
  try {
    const lead = store.save("leads", {
      name: "Alice",
      company: "Acme",
      email: "alice@example.com",
      value: 12345.67,
      status: "New",
    }) as Lead;
    const deal = store.save("deals", {
      title: "Contract",
      leadId: lead.id,
      stageId: "new",
      value: 12345.67,
      probability: 20,
    }) as Deal;
    assert.throws(() => store.remove("leads", lead.id), /linked deals/);
    assert.throws(
      () =>
        store.save("deals", {
          title: "Orphan",
          leadId: "bad-id",
          stageId: "new",
          value: 1,
          probability: 1,
        }),
      /existing lead/,
    );
    store.save(
      "deals",
      {
        title: deal.title,
        leadId: lead.id,
        stageId: "won",
        value: deal.value,
        probability: 100,
      },
      deal.id,
    );
    store.settings({
      workspaceName: "Acme workspace",
      supportEmail: "",
      appearance: "dark",
    });
    store.db.close();
    store = new Store(join(dir, "test.sqlite"));
    const snapshot = store.snapshot();
    assert.equal(snapshot.deals[0]?.stageId, "won");
    assert.equal(snapshot.settings.appearance, "dark");
    assert.equal(snapshot.leads.length, 1);
    assert.equal(metrics(snapshot.deals, 30).revenue, 12345.67);
    assert.equal(metrics(snapshot.deals, 30).winRate, 100);
    assert.equal(currency(12345.67), "$12,345.67");
    store.remove("deals", deal.id);
    store.remove("leads", lead.id);
    assert.equal(store.snapshot().leads.length, 0);
    assert.ok(snapshot.events.length >= 4);
  } finally {
    store.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("validation rejects malformed email, negative values, unknown fields, invalid stages, and excessive probability", () => {
  const lead = {
    name: "A",
    company: "B",
    email: "a@example.com",
    status: "New",
    value: 1,
  };
  assert.equal(leadInput.safeParse({ ...lead, value: -1 }).success, false);
  assert.equal(
    leadInput.safeParse({ ...lead, email: "not-email" }).success,
    false,
  );
  assert.equal(
    leadInput.safeParse({ ...lead, ownerId: "someone-else" }).success,
    false,
  );
  assert.equal(
    dealInput.safeParse({
      title: "Contract",
      leadId: "142f8128-6941-42a6-a8c0-07e1ae748e2b",
      stageId: "invalid",
      value: 1,
      probability: 101,
    }).success,
    false,
  );
});

test("record changes roll back if the activity write fails", () => {
  const store = new Store(":memory:");
  try {
    store.db.exec(
      `CREATE TRIGGER reject_event BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT, 'activity unavailable'); END;`,
    );
    assert.throws(
      () =>
        store.save("leads", {
          name: "Alice",
          company: "Acme",
          email: "alice@example.com",
          value: 1,
          status: "New",
        }),
      /activity unavailable/,
    );
    assert.equal(store.snapshot().leads.length, 0);
  } finally {
    store.db.close();
  }
});
