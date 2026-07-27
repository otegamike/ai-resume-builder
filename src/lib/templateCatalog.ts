import type { ResumeContent } from "@/types/ResumeData";
// export type TemplateData = ResumeContent;

export interface TemplateData extends ResumeContent {
  multipage?: "true" | "false";
} 

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  html: string;
  kind: "html" | "react-pdf";
  tier: "free" | "pro";
  page: {
    widthPx: number;
    heightPx: number;
    aspectRatio: number;
  };
}

export const TEMPLATE_PAGE = {
  widthPx: 794,
  heightPx: 1123,
  aspectRatio: 794 / 1123,
} as const;


export const templateDefinitions: TemplateDefinition[] = [
  { id: "template1", name: "Emerald", description: "Elegant two-column profile with modern accents", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template2", name: "Copper", description: "Warm editorial style for business-facing roles", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template3", name: "Sandstone", description: "Balanced professional layout with clean typography", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template4", name: "Monochrome", description: "High-contrast minimal style with bold headings", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template5", name: "Aurora", description: "Creative geometric style for portfolio-driven roles", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template6", name: "Rose", description: "Soft modern design with refined spacing", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template7", name: "Slate", description: "Structured corporate style optimized for scanning", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template8", name: "Ember", description: "Classic full-width single column with warm rust accents", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template9", name: "Indigo", description: "Diagonal gradient header with plum tones and rounded bullets", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template10", name: "Cascade", description: "Two-column with angled clip-path sidebar in teal", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template11", name: "Noir", description: "Inverted dark theme with high-contrast light text", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template12", name: "Citrine", description: "Gold-accent two-column layout with warm ivory background", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template13", name: "Sapphire", description: "Navy header with gold accents and clean two-column body", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template14", name: "Terra", description: "Warm terracotta single-column with centered name block", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template15", name: "Mist", description: "Sage-green two-column layout with subdued slate tones", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template16", name: "Pewter", description: "Dark charcoal geometric sidebar with light content panel", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template17", name: "Bloom", description: "Blush and sage two-column design with soft decorative shapes", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template18", name: "Amber", description: "Geometric SVG-panel sidebar with warm amber tones and Fraunces serif", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template19", name: "Obsidian", description: "Dark aubergine header with gold accents and Syne display type", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "template20", name: "Ivory", description: "Single-column editorial elegance with warm cream background and Gilda Display", html: "", kind: "html", tier: "free", page: TEMPLATE_PAGE },
  { id: "ats-classic", name: "ATS Classic", description: "Clean single-column ATS-optimized layout with real text", html: "", kind: "html", tier: "pro", page: TEMPLATE_PAGE },
];

export type TemplateId = typeof templateDefinitions[number]["id"];

