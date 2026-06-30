import { PersonalInfo, Experience, Education, Project, ResumeContent } from "@/types/ResumeData";

export const initialPersonalInfo: PersonalInfo = {
    name: "",
    fullname: { firstName: "", otherNames: "" },
    jobTitle: "",
    email: "",
    phone: "",
    location: "",
    website: "",
};

export const initialExperience: Experience = {
    id: "",
    company: "",
    role: "",
    startDate: "",
    endDate: "",
    description: [],
};

export const initialEducation: Education = {
    id: "",
    school: "",
    degree: "",
    startDate: "",
    endDate: "",
};

export const initialProject: Project = {
    id: "",
    name: "",
    description: [],
};

export const initialResume: ResumeContent = {
  personalInfo:initialPersonalInfo,
  summary: "",
  experience: [initialExperience],
  education: [initialEducation],
  projects: [],
  skills: ["Project Management", "Problem Solving"],
  skillCategories: [],
  skillCategorized: false
};

export const maxSkillCount = 15;