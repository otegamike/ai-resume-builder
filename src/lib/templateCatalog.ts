import type { ResumeContent } from "@/types/ResumeData";
export type TemplateData = ResumeContent;

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  html: string;
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
  { id: "template1", name: "Emerald", description: "Elegant two-column profile with modern accents", html: "", page: TEMPLATE_PAGE },
  { id: "template2", name: "Copper", description: "Warm editorial style for business-facing roles", html: "", page: TEMPLATE_PAGE },
  { id: "template3", name: "Sandstone", description: "Balanced professional layout with clean typography", html: "", page: TEMPLATE_PAGE },
  { id: "template4", name: "Monochrome", description: "High-contrast minimal style with bold headings", html: "", page: TEMPLATE_PAGE },
  { id: "template5", name: "Aurora", description: "Creative geometric style for portfolio-driven roles", html: "", page: TEMPLATE_PAGE },
  { id: "template6", name: "Rose", description: "Soft modern design with refined spacing", html: "", page: TEMPLATE_PAGE },
  { id: "template7", name: "Slate", description: "Structured corporate style optimized for scanning", html: "", page: TEMPLATE_PAGE },
];

export type TemplateId = typeof templateDefinitions[number]["id"];



// export type OldTemplateId =
//   | "template1"
//   | "template2"
//   | "template3"
//   | "template4"
//   | "template5"
//   | "template6"
//   | "template7";

// export interface OldTemplateData {
//   personalInfo: {
//     name: string;
//     jobTitle: string;
//     email: string;
//     phone: string;
//     location: string;
//     website: string;
//     photo?: string;
//   };
//   summary: string;
//   experience: Array<{
//     id: string;
//     company: string;
//     role: string;
//     startDate: string;
//     endDate: string;
//     description: string;
//   }>;
//   education: Array<{
//     id: string;
//     school: string;
//     degree: string;
//     startDate: string;
//     endDate: string;
//   }>;
//   skills: string[];
// }
