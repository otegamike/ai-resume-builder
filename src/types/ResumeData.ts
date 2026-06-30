export interface PersonalInfo {
    name: string;
    fullname: {firstName: string, otherNames: string};
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    photo?: string;
};

export interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
}

export interface Project {
  id: string;
  name: string;
  description: string[];
}

export interface SkillCategory {
  id: string;
  category: string;
  skills: string[];
}

export interface ResumeContent {
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  projects?: Project[];
  skills: string[];
  skillCategories?: SkillCategory[];
  skillCategorized?: boolean;
}

export interface Resume {
  _id: string;
  title: string;
  updatedAt: string;
  template: string;
  content: ResumeContent;
}
