import "server-only";

import type { AtsReport } from "@/types/AtsReport";
import type { ResumeContent } from "@/types/ResumeData";
import type { TailorReport } from "@/types/TailorReport";
import type { ParsedJobAd } from "@/types/JobAdData";
import type { JobMatchAnalysis } from "@/types/JobApplicationData";
import { JOB_CATEGORIES, DEFAULT_JOB_CATEGORY } from "@/lib/jobCategories";

export const emptyResumeContent: ResumeContent = {
  personalInfo: {
    name: "",
    fullname: { firstName: "", otherNames: "" },
    jobTitle: "",
    email: "",
    phone: "",
    location: "",
    website: "",
  },
  summary: "",
  experience: [],
  education: [],
  projects: [],
  skills: [],
  skillCategories: [],
  skillCategorized: false,
};

export function stringifyListItem(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    const primary = ["description", "detail", "title", "field", "name", "keyword"]
      .map((key) => record[key])
      .find((v) => typeof v === "string" && (v as string).trim());
    if (typeof primary === "string") {
      const field = typeof record.field === "string" ? record.field.trim() : "";
      const text = primary.trim();
      return field && field !== text ? `${field}: ${text}` : text;
    }
    return JSON.stringify(item);
  }
  return "";
}

export function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(stringifyListItem).filter(Boolean);
}

export function normalizeResumeContent(content: Partial<ResumeContent> | undefined): ResumeContent {
  return {
    personalInfo: {
      ...emptyResumeContent.personalInfo,
      ...(content?.personalInfo ?? {}),
      fullname: {
        ...emptyResumeContent.personalInfo.fullname,
        ...(content?.personalInfo?.fullname ?? {}),
      },
    },
    summary: content?.summary ?? "",
    experience: Array.isArray(content?.experience) ? content.experience : [],
    education: Array.isArray(content?.education) ? content.education : [],
    projects: Array.isArray(content?.projects) ? content.projects : [],
    skills: normalizeStringList(content?.skills),
    skillCategories: Array.isArray(content?.skillCategories)
      ? content.skillCategories.map((cat) => ({
          id: cat.id ?? "",
          category: cat.category ?? "",
          skills: Array.isArray(cat.skills) ? cat.skills : [],
        }))
      : [],
    skillCategorized: content?.skillCategorized ?? false,
  };
}

export function normalizeAtsReport(report: Partial<AtsReport>, extractedText: string): AtsReport {
  return {
    score: Math.max(0, Math.min(100, Number(report.score) || 0)),
    verdict: report.verdict || "ATS review completed.",
    strengths: normalizeStringList(report.strengths),
    issues: Array.isArray(report.issues) ? report.issues : [],
    recommendedKeywords: normalizeStringList(report.recommendedKeywords),
    extractedText: report.extractedText || extractedText,
    parsedResume: normalizeResumeContent(report.parsedResume),
    improvedResume: normalizeResumeContent(report.improvedResume),
  };
}

export function normalizeTailorReport(report: Partial<TailorReport>): TailorReport {
  return {
    explanation: report.explanation || "CV tailored for the job.",
    keyChanges: normalizeStringList(report.keyChanges),
    tailoredResume: normalizeResumeContent(report.tailoredResume),
    matchAnalysis: normalizeMatchAnalysis(report.matchAnalysis || {}),
  };
}

export function normalizeMatchAnalysis(raw: Partial<JobMatchAnalysis>): JobMatchAnalysis {
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0))),
    missingKeywords: normalizeStringList(raw.missingKeywords),
    missingSkills: normalizeStringList(raw.missingSkills),
    strengths: normalizeStringList(raw.strengths),
    weaknesses: normalizeStringList(raw.weaknesses),
    gaps: normalizeStringList(raw.gaps),
    suggestions: normalizeStringList(raw.suggestions),
    verdict: typeof raw.verdict === "string" ? raw.verdict.trim() : "",
  };
}

export function normalizeParsedJobAd(raw: Partial<ParsedJobAd>): ParsedJobAd {
  const validCategories = [...JOB_CATEGORIES] as unknown as string[];
  const validJobTypes = ["full-time", "part-time", "contract", "freelance", "internship"];
  const validWorkplace = ["remote", "hybrid", "on-site"];
  const validExp = ["entry", "mid", "senior", "lead", "executive"];
  const validPeriods = ["yearly", "monthly", "hourly"];
  const validAppTypes = ["on_platform", "external_link", "email"];
  let applicationType = validAppTypes.includes(raw.applicationType as string) ? (raw.applicationType as string) : "on_platform";
  let externalUrl = typeof raw.externalUrl === "string" ? raw.externalUrl.trim() : "";
  let contactEmail = typeof raw.contactEmail === "string" ? raw.contactEmail.trim() : "";
  if (applicationType === "external_link" && !externalUrl) applicationType = "on_platform";
  if (applicationType === "email" && !contactEmail) applicationType = "on_platform";
  if (externalUrl && !/^https?:\/\//i.test(externalUrl) && !externalUrl.includes(".")) externalUrl = "";
  if (externalUrl && applicationType !== "external_link") externalUrl = "";
  if (contactEmail && !contactEmail.includes("@")) contactEmail = "";
  if (contactEmail && applicationType !== "email") contactEmail = "";

  let salaryMin = typeof raw.salaryMin === "number" && !isNaN(raw.salaryMin) ? raw.salaryMin : null;
  let salaryMax = typeof raw.salaryMax === "number" && !isNaN(raw.salaryMax) ? raw.salaryMax : null;
  let salaryCurrencyRaw = typeof raw.salaryCurrency === "string" ? raw.salaryCurrency.trim() : "";
  const symbolToCode: Record<string, string> = { "$": "USD", "£": "GBP", "€": "EUR", "₦": "NGN", "₹": "INR" };
  if (symbolToCode[salaryCurrencyRaw]) salaryCurrencyRaw = symbolToCode[salaryCurrencyRaw];
  if (salaryCurrencyRaw.length === 1 && symbolToCode[salaryCurrencyRaw]) salaryCurrencyRaw = symbolToCode[salaryCurrencyRaw];
  const salaryCurrency = salaryCurrencyRaw ? salaryCurrencyRaw.toUpperCase().slice(0, 3) : "USD";
  const salaryPeriodRaw = typeof raw.salaryPeriod === "string" ? raw.salaryPeriod.trim().toLowerCase() : "";
  const periodMap: Record<string, string> = { "per annum": "yearly", annum: "yearly", annual: "yearly", "per year": "yearly", yearly: "yearly", "per month": "monthly", monthly: "monthly", "per hour": "hourly", hourly: "hourly", "/hr": "hourly", "per hr": "hourly" };
  const salaryPeriod = periodMap[salaryPeriodRaw] ?? (validPeriods.includes(salaryPeriodRaw) ? salaryPeriodRaw : "yearly");
  if (salaryMin === null && salaryMax !== null) { salaryMin = salaryMax; salaryMax = null; }
  const rawCompanyName = typeof raw.companyName === "string" ? raw.companyName.trim() : "";
  const companyName = rawCompanyName || "Unspecified Company";
  const summary = typeof raw.summary === "string" ? raw.summary.trim().slice(0, 280) : "";
  return {
    title: typeof raw.title === "string" ? raw.title.trim() : "",
    category: validCategories.includes(raw.category as string) ? raw.category as string : DEFAULT_JOB_CATEGORY,
    jobType: validJobTypes.includes(raw.jobType as string) ? raw.jobType as string : "full-time",
    workplaceType: validWorkplace.includes(raw.workplaceType as string) ? raw.workplaceType as string : "remote",
    location: typeof raw.location === "string" && raw.location.trim() ? raw.location.trim() : "Remote",
    experienceLevel: validExp.includes(raw.experienceLevel as string) ? raw.experienceLevel as string : "mid",
    salaryMin,
    salaryMax,
    salaryCurrency,
    salaryPeriod,
    summary,
    description: typeof raw.description === "string" ? raw.description.trim() : "",
    requirements: normalizeStringList(raw.requirements),
    benefits: normalizeStringList(raw.benefits),
    skillsRequired: normalizeStringList(raw.skillsRequired),
    companyName,
    companyWebsite: typeof raw.companyWebsite === "string" ? raw.companyWebsite.trim() : "",
    companyLogo: typeof raw.companyLogo === "string" ? raw.companyLogo.trim() : "",
    companyLocation: typeof raw.companyLocation === "string" ? raw.companyLocation.trim() : "",
    companyIndustry: typeof raw.companyIndustry === "string" ? raw.companyIndustry.trim() : "",
    companyDescription: typeof raw.companyDescription === "string" ? raw.companyDescription.trim() : "",
    applicationType,
    externalUrl,
    contactEmail,
  };
}
