import { promises as fs } from "fs";
import path from "path";
import { templateDefinitions, type TemplateDefinition, type TemplateId } from "@/lib/templateCatalog";

const templatesDir = path.join(process.cwd(), "src", "templates_formatted");

export function isTemplateId(value: string): value is TemplateId {
  return templateDefinitions.some((template) => template.id === value);
}

export async function readTemplateHtml(id: TemplateId): Promise<string> {
  const templatePath = path.join(templatesDir, `${id}.html`);
  return fs.readFile(templatePath, "utf8");
}

export async function getTemplateDefinition(id: TemplateId): Promise<TemplateDefinition> {
  const metadata = templateDefinitions.find((template) => template.id === id);
  if (!metadata) {
    throw new Error(`Unknown template id: ${id}`);
  }

  const html = await readTemplateHtml(id);
  return { ...metadata, html };
}

export async function getAllTemplateDefinitions(): Promise<TemplateDefinition[]> {
  return Promise.all(templateDefinitions.map((template) => getTemplateDefinition(template.id)));
}

