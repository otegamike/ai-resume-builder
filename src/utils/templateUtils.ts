import type { TemplateDefinition } from "@/lib/templateCatalog";

export function getRandomTemplateId(catalogue: TemplateDefinition[]): string {
  const index = Math.floor(Math.random() * catalogue.length);
  return catalogue[index].id;
}
