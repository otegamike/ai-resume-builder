import type { ResumeContent } from "@/types/ResumeData";
import type { PdfRenderModel } from "@/lib/pdf/types";

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

function buildPeriod(startDate: string, endDate: string): string {
  const start = clean(startDate);
  const end = clean(endDate);
  if (!start && !end) return "";
  if (!start) return end;
  if (!end) return start;
  return `${start} - ${end}`;
}

export function buildPdfRenderModel(resume: ResumeContent): PdfRenderModel {
  const summary = clean(resume.summary);
  const skills = resume.skills.map(clean).filter(Boolean);

  const experience = resume.experience.map((entry) => ({
    id: entry.id,
    company: clean(entry.company),
    role: clean(entry.role),
    period: buildPeriod(entry.startDate, entry.endDate),
    description: entry.description.map(clean).filter(Boolean),
  })).filter((entry) => entry.company || entry.role || entry.period || entry.description.length > 0);

  const education = resume.education.map((entry) => ({
    id: entry.id,
    school: clean(entry.school),
    degree: clean(entry.degree),
    period: buildPeriod(entry.startDate, entry.endDate),
  })).filter((entry) => entry.school || entry.degree || entry.period);

  return {
    personalInfo: {
      name: clean(resume.personalInfo.name),
      jobTitle: clean(resume.personalInfo.jobTitle),
      email: clean(resume.personalInfo.email),
      phone: clean(resume.personalInfo.phone),
      location: clean(resume.personalInfo.location),
      website: clean(resume.personalInfo.website),
      photo: clean(resume.personalInfo.photo),
    },
    summary,
    experience,
    education,
    skills,
    hasSummary: Boolean(summary),
    hasSkills: skills.length > 0,
    hasExperience: experience.length > 0,
    hasEducation: education.length > 0,
  };
}
