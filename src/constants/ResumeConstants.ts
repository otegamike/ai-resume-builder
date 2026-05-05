import { PersonalInfo, Experience, Education, ResumeContent } from "@/types/ResumeData";

export const initialPersonalInfo: PersonalInfo = {
    name: "",
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
    description: [""],
};

export const initialEducation: Education = {
    id: "",
    school: "",
    degree: "",
    startDate: "",
    endDate: "",
};

export const initialResume: ResumeContent = {
  personalInfo:initialPersonalInfo,
  summary: "",
  experience: [initialExperience],
  education: [initialEducation],
  skills: ["Project Management", "Problem Solving"]
} as const;