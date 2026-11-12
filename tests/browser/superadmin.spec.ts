import { test, expect } from "@playwright/test";
test("password visibility, remembered sign-in, superadmin overview and session revocation", async ({
  page,
  browser,
}) => {
  await page.goto("/app#/superadmin");
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveAttribute("type", "password");
  await password.fill("browser-test-password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("browser-test-password");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(
    page.getByLabel("Remember me", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Email", { exact: true }).fill("browser@example.com");
  await page.getByLabel("Remember me", { exact: true }).check();
  const loginRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/auth/sign-in/email") &&
      request.method() === "POST",
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await loginRequest).postDataJSON().rememberMe).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Superadmin dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "User directory" }),
  ).toBeVisible();
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  const sessionCookie = (await page.context().cookies()).find((cookie) =>
    cookie.name.endsWith("session_token"),
  )!;
  expect(sessionCookie.httpOnly).toBe(true);
  expect(sessionCookie.expires).toBeGreaterThan(Date.now() / 1000);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Superadmin dashboard", exact: true }),
  ).toBeVisible();
  // A second device uses a separate browser context, not the first device's cookie jar.
  const second = await browser.newContext();
  const otherPage = await second.newPage();
  await otherPage.goto("/app");
  await otherPage
    .getByLabel("Email", { exact: true })
    .fill("browser@example.com");
  await otherPage
    .getByLabel("Password", { exact: true })
    .fill("browser-test-password");
  const secondRequest = otherPage.waitForRequest(
    (request) =>
      request.url().endsWith("/api/auth/sign-in/email") &&
      request.method() === "POST",
  );
  await otherPage.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await secondRequest).postDataJSON().rememberMe).toBe(false);
  await expect(
    otherPage.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  expect(
    (await second.cookies()).find((cookie) =>
      cookie.name.endsWith("session_token"),
    )!.expires,
  ).toBe(-1);
  await page.getByRole("button", { name: "Refresh overview" }).click();
  await page
    .getByRole("button", { name: "Revoke sessions for browser@example.com" })
    .click();
  await page.getByRole("button", { name: "Confirm revoke" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your current session is still active",
  );
  await otherPage.reload();
  await expect(
    otherPage.getByRole("heading", { name: "Sign in to GlassCRM" }),
  ).toBeVisible();
  await second.close();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Superadmin dashboard", exact: true }),
  ).toBeVisible();
  const mobileHeading = await page
    .getByRole("heading", { name: "Superadmin dashboard", exact: true })
    .boundingBox();
  expect(mobileHeading!.x + mobileHeading!.width).toBeLessThanOrEqual(375);
});
