import { test, expect } from "@playwright/test";
test("static public pages work without JavaScript and without CRM API requests", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      apiRequests.push(request.url());
  });
  for (const [path, title] of [
    ["/", "Six stages.One clear pipeline."],
    ["/product", "From first contact to closed deal."],
    ["/pricing", "Pricing is still taking shape."],
    ["/contact", "Let’s talk about your sales workflow."],
  ]) {
    await page.goto(path!);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title!);
    await expect(
      page.getByRole("navigation", { name: "Main navigation", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(apiRequests).toEqual([]);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/contact");
  await page.getByText("Menu", { exact: true }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Pricing", exact: true })
    .click();
  await expect(page).toHaveURL(/\/pricing$/);
  await page.goto("/contact");
  await expect(
    page.getByRole("link", { name: "Write to GlassCRM" }),
  ).toHaveAttribute("href", /^mailto:viraladmediacontent@gmail.com\?subject=/);
  await page.getByText("Can I sign up today?", { exact: true }).click();
  await expect(
    page.getByText(/support for multiple workspaces are still in development/),
  ).toBeVisible();
  await context.close();
});
test("workspace entry is protected and legacy bookmarks retain their destination", async ({
  page,
}) => {
  await page.goto("/#/pipeline");
  await expect(page).toHaveURL(/\/app#\/pipeline$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to GlassCRM" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "GlassCRM home", exact: false }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Six stages.One clear pipeline.",
  );
});
