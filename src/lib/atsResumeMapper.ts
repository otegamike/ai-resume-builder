import type { ResumeContent } from "@/types/ResumeData";

export interface AtsResumeView {
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
  experience: {
    role: string;
    company: string;
    startDate: string;
    endDate: string;
    description: string[];
  }[];
  education: {
    degree: string;
    school: string;
    startDate: string;
    endDate: string;
  }[];
  projects: {
    name: string;
    description: string[];
  }[];
  skills: string[];
  skillCategories: {
    category: string;
    skills: string[];
  }[];
}

export function mapResumeToAtsView(resume: ResumeContent): AtsResumeView {
  return {
    name: resume.personalInfo?.name ?? "",
    jobTitle: resume.personalInfo?.jobTitle ?? "",
    email: resume.personalInfo?.email ?? "",
    phone: resume.personalInfo?.phone ?? "",
    location: resume.personalInfo?.location ?? "",
    website: resume.personalInfo?.website ?? "",
    summary: resume.summary ?? "",
    experience: (resume.experience ?? []).map((exp) => ({
      role: exp.role,
      company: exp.company,
      startDate: exp.startDate,
      endDate: exp.endDate,
      description: exp.description ?? [],
    })),
    education: (resume.education ?? []).map((edu) => ({
      degree: edu.degree,
      school: edu.school,
      startDate: edu.startDate,
      endDate: edu.endDate,
    })),
    projects: (resume.projects ?? []).map((proj) => ({
      name: proj.name,
      description: proj.description ?? [],
    })),
    skills: resume.skills ?? [],
    skillCategories: (resume.skillCategories ?? []).map((cat) => ({
      category: cat.category,
      skills: cat.skills,
    })),
  };
}
