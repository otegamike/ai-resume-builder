import { expect, test } from "@playwright/test";

const resumePdf = {
  name: "resume.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n"),
};

test("shows the old-browser message when FileReader is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "FileReader", {
      configurable: true,
      value: undefined,
    });
  });

  await page.goto("/dev/old-browser-upload");
  await page.getByTestId("old-browser-file").setInputFiles(resumePdf);

  await expect(page.getByTestId("old-browser-message")).toContainText(
    "Your browser may be out of date"
  );
  await expect(page.getByTestId("old-browser-message")).toContainText(
    "Please update your browser"
  );
});

test("accepts a PDF when the required browser features exist", async ({ page }) => {
  await page.goto("/dev/old-browser-upload");
  await page.getByTestId("old-browser-file").setInputFiles(resumePdf);

  await expect(page.getByTestId("old-browser-message")).toContainText("File looks usable");
});
