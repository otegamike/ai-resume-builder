import type { TemplateDefinition } from "@/lib/templateCatalog";

export function getRandomTemplateId(catalogue: TemplateDefinition[]): string {
  if (!catalogue || catalogue.length === 0) return "template1";
  const index = Math.floor(Math.random() * catalogue.length);
  return catalogue[index].id;
}
