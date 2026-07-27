import { pdf } from "@react-pdf/renderer";
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
    console.error(`No React-PDF component registered for template: ${templateId}`);
    return;
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
