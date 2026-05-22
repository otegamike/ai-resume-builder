import type { TemplateId } from "@/lib/templateCatalog";
import type { TextStyle, ViewStyle, ImageStyle } from "@react-pdf/types";

export interface PdfTemplateRendererProps {
  resume: PdfRenderModel;
  templateId: TemplateId;
}

export interface PdfRenderModel {
  personalInfo: {
    name: string;
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    photo?: string;
  };
  summary: string;
  experience: Array<{
    id: string;
    company: string;
    role: string;
    period: string;
    description: string[];
  }>;
  education: Array<{
    id: string;
    school: string;
    degree: string;
    period: string;
  }>;
  skills: string[];
  hasSummary: boolean;
  hasSkills: boolean;
  hasExperience: boolean;
  hasEducation: boolean;
}

export interface PdfTheme {
  pageBackground: string;
  sidebarBackground: string;
  primaryText: string;
  secondaryText: string;
  accent: string;
  divider: string;
}

export interface TemplateTextToken {
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: TextStyle["textTransform"];
  color: string;
}

export interface TemplateStyleSpec {
  pageBackground: string;
  sidebarBackground: string;
  mainBackground: string;
  primaryText: string;
  secondaryText: string;
  accent: string;
  divider: string;
  borderColor: string;
  sidebarWidthPct: number;
  pagePadding: number;
  sectionGap: number;
  sectionSpacing: number;
  rowSpacing: number;
  bulletIndent: number;
  photoSize: number;
  photoBorderWidth: number;
  cornerRadius: number;
  fonts: {
    display: string;
    body: string;
    mono: string;
  };
  text: {
    name: TemplateTextToken;
    title: TemplateTextToken;
    sectionLabel: TemplateTextToken;
    body: TemplateTextToken;
    muted: TemplateTextToken;
    itemHeading: TemplateTextToken;
    itemSubheading: TemplateTextToken;
    bullet: TemplateTextToken;
    skill: TemplateTextToken;
  };
}

export interface TemplateLayoutSpec {
  summaryInMain: boolean;
  contactInSidebar: boolean;
  skillsInSidebar: boolean;
  educationFirst: boolean;
  showPhoto: boolean;
  bulletPrefix: string;
  entrySeparator: boolean;
  showTitleUppercase: boolean;
}

export interface ResolvedPdfTemplate {
  id: TemplateId;
  style: TemplateStyleSpec;
  layout: TemplateLayoutSpec;
}

export interface MappedPdfStyles {
  page: ViewStyle;
  root: ViewStyle;
  sidebar: ViewStyle;
  main: ViewStyle;
  divider: ViewStyle;
  section: ViewStyle;
  sectionHeader: ViewStyle;
  itemWrap: ViewStyle;
  photo: ImageStyle;
  name: TextStyle;
  title: TextStyle;
  sectionTitle: TextStyle;
  text: TextStyle;
  muted: TextStyle;
  itemHeading: TextStyle;
  itemSubheading: TextStyle;
  bulletRow: ViewStyle;
  bulletSymbol: TextStyle;
  bulletText: TextStyle;
  skill: TextStyle;
}
