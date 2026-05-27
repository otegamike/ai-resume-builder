import html2pdf from "html2pdf.js";
import { getNearestPageHeight } from "@/utils/pageDimension";

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

export async function exportResumeAsPdf(
  exportIframeRef: React.RefObject<HTMLIFrameElement | null>,
  title: string,
  pageWidth: number,
  pageHeight: number,
): Promise<void> {
  const element = getExportElement(exportIframeRef);
  const iframeWindow = exportIframeRef.current?.contentWindow;
  if (!element || !iframeWindow) return;

  await new Promise((r) => setTimeout(r, 500));

  html2pdf()
    .set({
      margin: 15,
      filename: `${title || "resume"}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: true,
        onclone: buildOncloneHandler((cv) => {
          cv.style.height = "auto";
          void cv.offsetHeight;
          const initialHeight = cv.getBoundingClientRect().height;
          const finalHeight = getNearestPageHeight(initialHeight);
          cv.style.height = finalHeight + "px";
          cv.style.overflow = "visible";
          cv.style.minHeight = "0";
          cv.style.borderRadius = "0";
          cv.style.marginTop = "0";
        }),
      },
      jsPDF: {
        unit: "px" as const,
        format: [pageWidth, pageHeight] as [number, number],
        orientation: "portrait" as const,
      },
    })
    .from(element)
    .save();
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
