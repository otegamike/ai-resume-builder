import { pdf } from "@react-pdf/renderer";
import { AppError } from "@/lib/errors/AppError";
import { mapResumeToAtsView } from "@/lib/atsResumeMapper";
import { getAtsTemplateComponent } from "@/templates_pdf";
import type { TemplateId } from "@/lib/templateCatalog";
import type { ResumeContent } from "@/types/ResumeData";

export async function exportResumeAsAtsPdf(
  title: string,
  resume: ResumeContent,
  templateId: TemplateId,
): Promise<void> {
  const Component = getAtsTemplateComponent(templateId);
  if (!Component) {
    throw new AppError("This template can't be exported as a PDF right now.", {
      status: 400,
      code: "ATS_TEMPLATE_MISSING",
      userMessage: "This template can't be exported as a PDF right now. Please choose another template.",
    });
  }

  const viewData = mapResumeToAtsView(resume);
  const blob = await pdf(<Component data={viewData} />).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title || "resume"}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
