import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { chromium, type Browser } from "playwright";
import { buildTemplateSrcDoc } from "@/lib/templateRenderer";
import { getTemplateDefinition, isTemplateId } from "@/lib/templateServer";
import { TEMPLATE_PAGE, type TemplateId } from "@/lib/templateCatalog";
import type { ResumeContent } from "@/types/ResumeData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let browserPromise: Promise<Browser> | null = null;

interface ExportPdfPayload {
  title?: string;
  templateId?: string;
  resume?: ResumeContent;
}

function findCachedChromiumExecutable() {
  const defaultPath = chromium.executablePath();
  if (fs.existsSync(defaultPath)) return defaultPath;

  const cacheRoot = process.env.PLAYWRIGHT_BROWSERS_PATH
    || (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "ms-playwright") : "");

  if (!cacheRoot || !fs.existsSync(cacheRoot)) return undefined;

  const candidates = fs.readdirSync(cacheRoot)
    .filter((entry) => entry.startsWith("chromium-"))
    .sort()
    .reverse()
    .map((entry) => path.join(cacheRoot, entry, "chrome-win64", "chrome.exe"));

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function getBrowser() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || findCachedChromiumExecutable();

  browserPromise ??= chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  return browserPromise;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isResumeContent(value: unknown): value is ResumeContent {
  if (!isObject(value)) return false;
  return isObject(value.personalInfo)
    && typeof value.summary === "string"
    && Array.isArray(value.experience)
    && Array.isArray(value.education)
    && Array.isArray(value.skills);
}

function sanitizeFilename(value: string) {
  return (value || "resume").replace(/[\\/:*?"<>|]+/g, "-").trim() || "resume";
}

function buildPrintCss() {
  const { widthPx, heightPx } = TEMPLATE_PAGE;
  return `
    @page { size: ${widthPx}px ${heightPx}px; margin: 0; }
    html, body {
      width: ${widthPx}px !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .cv-viewport {
      width: ${widthPx}px !important;
      min-height: auto !important;
      display: block !important;
      align-items: initial !important;
      justify-content: initial !important;
    }
    .cv-scaler {
      display: block !important;
      transform: none !important;
      margin: 0 !important;
      transform-origin: top left !important;
    }
    .cv {
      width: ${widthPx}px !important;
      max-width: ${widthPx}px !important;
      margin: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      overflow: clip !important;
    }
    .page-indicator { display: none !important; }
  `;
}

async function waitForTemplateLayout(page: Awaited<ReturnType<Browser["newPage"]>>) {
  await page.waitForSelector(".cv", { timeout: 10_000 });
  await page.evaluate(async () => {
    if (!("fonts" in document)) return;
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  });
  await page.waitForTimeout(150);
}

export async function POST(request: Request) {
  let payload: ExportPdfPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid export payload" }, { status: 400 });
  }

  const templateId = payload.templateId;
  if (!templateId || !isTemplateId(templateId)) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (!isResumeContent(payload.resume)) {
    return NextResponse.json({ error: "Resume content is required" }, { status: 400 });
  }

  let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;

  try {
    const template = await getTemplateDefinition(templateId as TemplateId);
    const html = buildTemplateSrcDoc(template.html, payload.resume, { editorMode: true });
    const browser = await getBrowser();
    page = await browser.newPage({
      viewport: { width: TEMPLATE_PAGE.widthPx, height: TEMPLATE_PAGE.heightPx },
      deviceScaleFactor: 1,
    });

    try {
      await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 5_000 });
    } catch (error) {
      if (!(error instanceof Error) || !error.name.includes("Timeout")) throw error;
    }
    await waitForTemplateLayout(page);
    await page.addStyleTag({ content: buildPrintCss() });

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      width: `${TEMPLATE_PAGE.widthPx}px`,
      height: `${TEMPLATE_PAGE.heightPx}px`,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
    });

    const filename = `${sanitizeFilename(payload.title || "resume")}.pdf`;
    const pdfBlob = new Blob([new Uint8Array(pdf)], { type: "application/pdf" });
    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export PDF:", error);
    return NextResponse.json({ error: "Failed to export PDF" }, { status: 500 });
  } finally {
    await page?.close();
  }
}
