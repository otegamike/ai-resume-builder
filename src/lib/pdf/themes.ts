import type { TemplateId } from "@/lib/templateCatalog";
import type { ResolvedPdfTemplate, TemplateLayoutSpec, TemplateStyleSpec } from "@/lib/pdf/types";

const baseStyle: TemplateStyleSpec = {
  pageBackground: "#ffffff",
  sidebarBackground: "#f2f5f4",
  mainBackground: "#f7faf9",
  primaryText: "#1f2b2a",
  secondaryText: "#556b67",
  accent: "#2e6b5e",
  divider: "#b9d2cb",
  borderColor: "#dbe8e4",
  sidebarWidthPct: 30,
  pagePadding: 0,
  sectionGap: 24,
  sectionSpacing: 12,
  rowSpacing: 8,
  bulletIndent: 10,
  photoSize: 96,
  photoBorderWidth: 3,
  cornerRadius: 0,
  fonts: {
    display: "PlayfairDisplay",
    body: "Raleway",
    mono: "Courier",
  },
  text: {
    name: { fontFamily: "PlayfairDisplay", fontSize: 20, fontWeight: 700, lineHeight: 1.1, letterSpacing: 0.8, color: "#ffffff" },
    title: { fontFamily: "Raleway", fontSize: 9, fontWeight: 500, lineHeight: 1.2, letterSpacing: 2.2, textTransform: "uppercase", color: "#c8e3dc" },
    sectionLabel: { fontFamily: "Raleway", fontSize: 8, fontWeight: 700, lineHeight: 1.2, letterSpacing: 2.4, textTransform: "uppercase", color: "#2e6b5e" },
    body: { fontFamily: "Raleway", fontSize: 9, fontWeight: 400, lineHeight: 1.5, color: "#2f413e" },
    muted: { fontFamily: "Raleway", fontSize: 8, fontWeight: 400, lineHeight: 1.35, color: "#5a7570" },
    itemHeading: { fontFamily: "Raleway", fontSize: 10, fontWeight: 700, lineHeight: 1.25, color: "#183632" },
    itemSubheading: { fontFamily: "Raleway", fontSize: 8, fontWeight: 500, lineHeight: 1.25, color: "#5a7570" },
    bullet: { fontFamily: "Raleway", fontSize: 8, fontWeight: 300, lineHeight: 1.55, color: "#3a4a47" },
    skill: { fontFamily: "Raleway", fontSize: 8, fontWeight: 500, lineHeight: 1.3, color: "#3a4a47" },
  },
};

const baseLayout: TemplateLayoutSpec = {
  summaryInMain: false,
  contactInSidebar: true,
  skillsInSidebar: true,
  educationFirst: true,
  showPhoto: true,
  bulletPrefix: "-",
  entrySeparator: false,
  showTitleUppercase: true,
};

const templateConfigs: Record<TemplateId, ResolvedPdfTemplate> = {
  template1: {
    id: "template1",
    style: baseStyle,
    layout: baseLayout,
  },
  template2: {
    id: "template2",
    style: {
      ...baseStyle,
      accent: "#9a622f",
      sidebarBackground: "#efe3d5",
      mainBackground: "#f6f1ea",
      divider: "#d0b79f",
      text: {
        ...baseStyle.text,
        name: { ...baseStyle.text.name, color: "#5a3b1f" },
        title: { ...baseStyle.text.title, color: "#8a6b4e" },
        sectionLabel: { ...baseStyle.text.sectionLabel, color: "#7b4f27" },
      },
    },
    layout: { ...baseLayout, summaryInMain: true, educationFirst: false },
  },
  template3: {
    id: "template3",
    style: {
      ...baseStyle,
      accent: "#0b4f76",
      sidebarBackground: "#e8f1f8",
      mainBackground: "#f8fbfd",
      divider: "#b5d0e0",
      text: {
        ...baseStyle.text,
        name: { ...baseStyle.text.name, color: "#0b4f76", fontSize: 19 },
        title: { ...baseStyle.text.title, color: "#2e6b89", letterSpacing: 1.8 },
        sectionLabel: { ...baseStyle.text.sectionLabel, color: "#0b4f76" },
      },
    },
    layout: { ...baseLayout, summaryInMain: true, showPhoto: false, bulletPrefix: "•" },
  },
  template4: {
    id: "template4",
    style: {
      ...baseStyle,
      accent: "#111111",
      sidebarBackground: "#f2f2f2",
      mainBackground: "#ffffff",
      divider: "#cccccc",
      text: {
        ...baseStyle.text,
        name: { ...baseStyle.text.name, fontFamily: "Raleway", color: "#111111", letterSpacing: 0.2 },
        title: { ...baseStyle.text.title, color: "#3a3a3a", letterSpacing: 1.5 },
        sectionLabel: { ...baseStyle.text.sectionLabel, color: "#111111" },
      },
    },
    layout: { ...baseLayout, summaryInMain: true, showPhoto: false, entrySeparator: true, bulletPrefix: "•" },
  },
  template5: {
    id: "template5",
    style: {
      ...baseStyle,
      accent: "#6a3fb7",
      sidebarBackground: "#efe9ff",
      mainBackground: "#faf8ff",
      divider: "#cab8f6",
      text: {
        ...baseStyle.text,
        name: { ...baseStyle.text.name, color: "#3f2b6e" },
        title: { ...baseStyle.text.title, color: "#6a3fb7" },
        sectionLabel: { ...baseStyle.text.sectionLabel, color: "#6a3fb7" },
      },
    },
    layout: { ...baseLayout, summaryInMain: true, bulletPrefix: "•" },
  },
  template6: {
    id: "template6",
    style: {
      ...baseStyle,
      accent: "#b84473",
      sidebarBackground: "#fdeef4",
      mainBackground: "#fff9fb",
      divider: "#efbfd2",
      text: {
        ...baseStyle.text,
        name: { ...baseStyle.text.name, color: "#8a2951" },
        title: { ...baseStyle.text.title, color: "#b84473" },
        sectionLabel: { ...baseStyle.text.sectionLabel, color: "#8a2951" },
      },
    },
    layout: { ...baseLayout, summaryInMain: true, bulletPrefix: "•", showTitleUppercase: false },
  },
  template7: {
    id: "template7",
    style: {
      ...baseStyle,
      accent: "#334155",
      sidebarBackground: "#e9eef4",
      mainBackground: "#f8fafc",
      divider: "#c9d3df",
      text: {
        ...baseStyle.text,
        name: { ...baseStyle.text.name, fontFamily: "Raleway", color: "#1f2937" },
        title: { ...baseStyle.text.title, color: "#475569" },
        sectionLabel: { ...baseStyle.text.sectionLabel, color: "#334155" },
      },
    },
    layout: { ...baseLayout, summaryInMain: true, bulletPrefix: "-", showTitleUppercase: false },
  },
};

export function resolvePdfTemplate(templateId: TemplateId): ResolvedPdfTemplate {
  return templateConfigs[templateId] ?? templateConfigs.template1;
}

