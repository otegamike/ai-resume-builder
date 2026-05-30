import html2pdf from "html2pdf.js";
import type { ResumeContent } from "@/types/ResumeData";
import type { TemplateId } from "@/lib/templateCatalog";

function replaceImagesWithDivs(clonedDoc: Document) {
  const images = clonedDoc.querySelectorAll("img");
  images.forEach((img) => {
    const computedStyle = clonedDoc.defaultView?.getComputedStyle(img);
    const div = clonedDoc.createElement("div");
    div.style.backgroundImage = `url("${img.src}")`;
    div.style.backgroundSize = "cover";
    div.style.backgroundPosition = "center";

    if (computedStyle) {
      div.style.width = computedStyle.width !== "auto" ? computedStyle.width : img.width + "px";
      div.style.height = computedStyle.height !== "auto" ? computedStyle.height : img.height + "px";
      div.style.borderRadius = computedStyle.borderRadius;
      div.style.border = computedStyle.border;
      div.style.margin = computedStyle.margin;
      div.style.display = computedStyle.display !== "inline" ? computedStyle.display : "block";
    } else {
      div.style.width = img.width + "px";
      div.style.height = img.height + "px";
      div.style.display = "block";
    }

    div.className = img.className;
    img.replaceWith(div);
  });
}

function cleanupDom(clonedDoc: Document) {
  const viewport = clonedDoc.querySelector(".cv-viewport") as HTMLElement | null;
  if (viewport) {
    viewport.style.minHeight = "0";
    viewport.style.display = "block";
  }

  const scaler = clonedDoc.querySelector(".cv-scaler") as HTMLElement | null;
  if (scaler) {
    scaler.style.transform = "none";
  }

  clonedDoc.querySelectorAll(".page-indicator").forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });

  clonedDoc.querySelectorAll(".left, .right, .right-hero, .left-hero, .cv-scaler").forEach((el) => {
    (el as HTMLElement).style.borderRadius = "0";
  });

  clonedDoc.documentElement.style.overflow = "visible";
  clonedDoc.body.style.overflow = "visible";
}

function getExportElement(iframeRef: React.RefObject<HTMLIFrameElement | null>): HTMLElement | null {
  const doc = iframeRef.current?.contentDocument;
  return doc?.documentElement as HTMLElement | null;
}

function buildOncloneHandler(cvAdjust?: (cv: HTMLElement) => void) {
  return (clonedDoc: Document) => {
    replaceImagesWithDivs(clonedDoc);
    cleanupDom(clonedDoc);
    const cv = clonedDoc.querySelector(".cv") as HTMLElement | null;
    if (cv) cvAdjust?.(cv);
  };
}

function sanitizeFilename(value: string) {
  return (value || "resume").replace(/[\\/:*?"<>|]+/g, "-").trim() || "resume";
}

export async function exportResumeAsPdf(
  resume: ResumeContent,
  templateId: TemplateId,
  title: string,
): Promise<void> {
  const response = await fetch("/api/export/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, templateId, title }),
  });

  if (!response.ok) {
    let message = "Failed to export PDF";
    try {
      const payload = await response.json();
      if (typeof payload?.error === "string") message = payload.error;
    } catch {
      // The route may fail before returning JSON; keep the generic message.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFilename(title)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function exportResumeAsImage(
  exportIframeRef: React.RefObject<HTMLIFrameElement | null>,
  title: string,
): Promise<void> {
  const element = getExportElement(exportIframeRef);
  const iframeWindow = exportIframeRef.current?.contentWindow;
  if (!element || !iframeWindow) return;

  await new Promise((r) => setTimeout(r, 500));

  const worker = html2pdf()
    .set({
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: true,
        onclone: buildOncloneHandler((cv) => {
          cv.style.overflow = "visible";
          cv.style.height = "auto";
          cv.style.minHeight = "0";
          cv.style.borderRadius = "0";
          cv.style.marginTop = "0";
        }),
      },
    })
    .from(element)
    .toCanvas();

  worker.get("canvas").then((canvas: HTMLCanvasElement) => {
    const link = document.createElement("a");
    link.download = `${title || "resume"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}
