import { ResumeContent } from "@/types/ResumeData";
import { extractResumeTextFromImages } from "@/lib/ai";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MIN_EXTRACTED_TEXT_LENGTH = 120;
const MAX_PDF_VISION_PAGES = 4;
const PDF_RENDER_SCALE = 2;

export type PdfExtractionSource = "selectable-text" | "pdf-vision";

export interface PdfExtractionResult {
  text: string;
  source: PdfExtractionSource;
}

type PdfPageForRendering = {
  getViewport(options: { scale: number }): { width: number; height: number };
  render(options: unknown): { promise: Promise<void> };
};

type PdfDocumentForRendering = {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageForRendering>;
};

export const allowedResumeUploadTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export function assertSupportedUpload(file: File) {
  if (!allowedResumeUploadTypes.includes(file.type)) {
    throw new Error("Upload a PDF, PNG, JPG, JPEG, or WEBP resume.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Resume uploads must be 10MB or smaller.");
  }
}

export function isPdfUpload(file: File) {
  return file.type === "application/pdf";
}

export function isImageUpload(file: File) {
  return file.type.startsWith("image/");
}

export async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function extractTextFromPdf(file: File): Promise<PdfExtractionResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => {
        if (typeof item === "object" && item && "str" in item) {
          return String((item as { str: string }).str);
        }
        return "";
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText) {
      pageTexts.push(pageText);
    }
  }

  const text = pageTexts.join("\n\n").trim();
  if (text.length >= MIN_EXTRACTED_TEXT_LENGTH) {
    return {
      text,
      source: "selectable-text",
    };
  }

  const imageDataUrls = await renderPdfPagesToImageDataUrls(
    pdf as unknown as PdfDocumentForRendering
  );
  const visionText = await extractResumeTextFromImages(imageDataUrls);

  return {
    text: visionText,
    source: "pdf-vision",
  };
}

async function renderPdfPagesToImageDataUrls(pdf: PdfDocumentForRendering) {
  const canvas = await import("@napi-rs/canvas");
  const globalScope = globalThis as Record<string, unknown>;

  globalScope.DOMMatrix ??= canvas.DOMMatrix;
  globalScope.ImageData ??= canvas.ImageData;
  globalScope.Path2D ??= canvas.Path2D;

  const pageCount = Math.min(pdf.numPages, MAX_PDF_VISION_PAGES);
  const dataUrls: string[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const pageCanvas = canvas.createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );
    const context = pageCanvas.getContext("2d");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

    await page.render({
      canvas: pageCanvas,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    dataUrls.push(pageCanvas.toDataURL("image/png"));
  }

  return dataUrls;
}

export function resumeContentToText(content: ResumeContent) {
  const sections = [
    content.personalInfo.name,
    content.personalInfo.jobTitle,
    content.personalInfo.email,
    content.personalInfo.phone,
    content.personalInfo.location,
    content.personalInfo.website,
    content.summary,
    ...content.experience.flatMap((experience) => [
      experience.role,
      experience.company,
      `${experience.startDate} - ${experience.endDate}`,
      ...experience.description,
    ]),
    ...content.education.flatMap((education) => [
      education.degree,
      education.school,
      `${education.startDate} - ${education.endDate}`,
    ]),
    content.skills.join(", "),
  ];

  return sections.filter(Boolean).join("\n").trim();
}
