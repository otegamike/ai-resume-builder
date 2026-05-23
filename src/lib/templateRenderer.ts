import type { TemplateData, TemplateId } from "@/lib/templateCatalog";
import { formatName } from "@/utils/nameFormatter";


type RenderContext = Record<string, unknown> | string | number | boolean | null | undefined;

const SECTION_PATTERN = /\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const CONDITIONAL_PATTERN = /\{\{\?([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const TOKEN_PATTERN = /\{\{([\w.]+|\.)\}\}/g;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolvePath(path: string, context: RenderContext, root: Record<string, unknown>): unknown {
  if (path === ".") return context;

  const fromObject = (source: unknown): unknown => {
    if (!source || typeof source !== "object") return undefined;
    return path.split(".").reduce<unknown>((acc, key) => {
      if (!acc || typeof acc !== "object") return undefined;
      return (acc as Record<string, unknown>)[key];
    }, source);
  };

  const fromContext = fromObject(context);
  if (fromContext !== undefined) return fromContext;
  return fromObject(root);
}

function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function renderInternal(template: string, context: RenderContext, root: Record<string, unknown>): string {
  const withSections = template.replace(SECTION_PATTERN, (_, path: string, block: string) => {
    const value = resolvePath(path, context, root);
    if (!Array.isArray(value) || value.length === 0) return "";
    return value.map((item) => renderInternal(block, item as RenderContext, root)).join("");
  });

  const withConditionals = withSections.replace(CONDITIONAL_PATTERN, (_, path: string, block: string) => {
    const value = resolvePath(path, context, root);
    return isTruthy(value) ? renderInternal(block, context, root) : "";
  });

  return withConditionals.replace(TOKEN_PATTERN, (_, path: string) => {
    const value = resolvePath(path, context, root);
    return escapeHtml(value ?? "");
  });
}

export function renderTemplate(templateHtml: string, data: TemplateData): string {
  return renderInternal(templateHtml, data as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>);
}

export function buildTemplateSrcDoc(
  templateHtml: string,
  data: TemplateData,
  options?: { editorMode?: boolean }
): string {
  const fullName: string  = data.personalInfo?.name;
  const firstName: string = data.personalInfo?.fullname?.firstName;
  const skillsFormatted: string[] = data.skills.slice(0, 12);
  const formattedName = formatName(fullName);

  const newData: TemplateData = (fullName&&!firstName)?
    {...data, personalInfo: {...data.personalInfo, fullname:  formattedName }, skills: skillsFormatted} 
    : 
    { ...data, skills: skillsFormatted };
  const finalData: TemplateData = (options?.editorMode)? {...newData, multipage: "true"} : newData;
  return renderTemplate(templateHtml, finalData);
}

export function getTemplatePreviewData(): TemplateData {
  return {
    personalInfo: {
      name: "Avery Johnson",
      fullname: { firstName: "Avery", otherNames: "Johnson" },
      jobTitle: "Senior Product Designer",
      email: "avery@example.com",
      phone: "+1 (555) 180-4091",
      location: "Austin, TX",
      website: "avery.design",
      photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80&auto=format&fit=crop",
    },
    summary:
      "Results-oriented designer with 7+ years of experience leading product strategy, design systems, and end-to-end UX for B2B SaaS products.",
    experience: [
      {
        id: "1",
        company: "Nimbus Labs",
        role: "Lead Product Designer",
        startDate: "2022",
        endDate: "Present",
        description:[
          "Led redesign of onboarding and activation flows, improving trial-to-paid conversion by 24% while reducing support tickets by 31%.",
          "Established and scaled a centralized design system, reducing design-to-engineering handoff time by 40% and ensuring visual consistency across web and mobile platforms.",
          "Mentored a team of 4 junior designers and spearheaded weekly design critiques, fostering a culture of feedback that increased overall sprint velocity by 15%."
        ]
      },
      {
        id: "2",
        company: "Orbit Commerce",
        role: "Product Designer",
        startDate: "2019",
        endDate: "2022",
        description:[
          "Shipped scalable checkout and account experiences across web and mobile, reducing cart abandonment and increasing retention.",
          "Collaborated with cross-functional teams to define product strategy, roadmap, and design execution for key growth initiatives.",
          "Conducted 20+ user interviews and usability tests to identify pain points and inform design decisions."
        ]
      },
    ],
    education: [
      {
        id: "1",
        school: "University of Washington",
        degree: "B.Sc. Human Centered Design",
        startDate: "2013",
        endDate: "2017",
      },
    ],
    skills: ["Figma", "Design Systems", "User Research", "Prototyping", "Product Strategy", "Accessibility"],
  };
}

export function normalizeTemplateId(templateId: string): TemplateId {
  const legacyMap: Record<string, TemplateId> = {
    modern: "template1",
    classic: "template2",
    minimal: "template3",
    creative: "template4",
  };

  if (templateId in legacyMap) return legacyMap[templateId];
  if (templateId.startsWith("template")) {
    const casted = templateId as TemplateId;
    return casted;
  }

  return "template1";
}
