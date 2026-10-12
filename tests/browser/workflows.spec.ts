import { test, expect } from "@playwright/test";
test("sign-in, lead and deal CRUD, persistence, settings, chart layout, CSV and mobile navigation", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill("browser@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
  const chart = await page.locator(".recharts-surface").first().boundingBox();
  expect(chart!.height).toBeGreaterThan(200);
  await page.getByRole("button", { name: "New lead", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Browser Alice");
  await dialog.getByLabel("Company", { exact: true }).fill("Acme");
  await dialog.getByLabel("Email", { exact: true }).fill("alice@example.com");
  await dialog.getByLabel("Value (USD)").fill("12345.67");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Browser Alice", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export filtered leads" }).click();
  expect((await download).suggestedFilename()).toBe("glasscrm-leads.csv");
  await page.getByRole("link", { name: "Pipeline", exact: true }).click();
  await page.getByRole("button", { name: "Add deal", exact: true }).click();
  await dialog.getByLabel("Deal title").fill("Browser contract");
  await dialog
    .getByLabel("Lead", { exact: true })
    .selectOption({ label: "Browser Alice — Acme" });
  await dialog.getByLabel("Value (USD)").fill("12345.67");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser contract" }),
  ).toBeVisible();
  await page.getByLabel("Stage for Browser contract").selectOption("won");
  await expect(
    page
      .getByRole("region", { name: "Won deals" })
      .getByRole("heading", { name: "Browser contract" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Won deals" })
      .getByRole("heading", { name: "Browser contract" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Workspace name").fill("Browser workspace");
  await page.getByLabel("Appearance").selectOption("dark");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved");
  await expect(page.locator("html")).toHaveClass("dark");
  await page.reload();
  await expect(page.getByLabel("Workspace name")).toHaveValue(
    "Browser workspace",
  );
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByText("$12,345.67", { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("Reporting period").selectOption("7");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Leads", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Leads", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search leads and deals").fill("no match");
  await expect(
    page.getByText("No leads match.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Search leads and deals").fill("");
  await page.getByRole("button", { name: "Edit Browser Alice" }).click();
  await dialog.getByLabel("Name", { exact: true }).fill("Alice Updated");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Alice Updated", exact: true }),
  ).toBeVisible();
  page.on("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Delete Alice Updated" }).click();
  await expect(page.getByRole("alert")).toContainText("Delete linked deals");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Pipeline", exact: true }).click();
  await page.getByRole("button", { name: "Delete Browser contract" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser contract" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Leads", exact: true }).click();
  await page.getByRole("button", { name: "Delete Alice Updated" }).click();
  await expect(page.getByRole("cell", { name: "Alice Updated" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to GlassCRM" }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});
