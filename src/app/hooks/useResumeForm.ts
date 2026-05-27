"use client";

import { useState, useCallback } from "react";
import type { ResumeContent } from "@/types/ResumeData";
import { initialResume, maxSkillCount } from "@/constants/ResumeConstants";
import { formatName } from "@/utils/nameFormatter";

export function useResumeForm(onChange?: (next: ResumeContent) => void) {
  const [resume, setResume] = useState<ResumeContent>(initialResume);
  const [newSkill, setNewSkill] = useState("");
  const [aiSuggestedSkills, setAiSuggestedSkills] = useState<string[]>([]);
  const [skillsError, setSkillsError] = useState("");

  const update = useCallback((next: ResumeContent) => {
    setResume(next);
    onChange?.(next);
  }, [onChange]);

  const handlePersonalInfoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let next: ResumeContent;
    if (e.target.name === "name") {
      const formattedName = formatName(e.target.value);
      next = {
        ...resume,
        personalInfo: { ...resume.personalInfo, [e.target.name]: e.target.value, fullname: formattedName },
      };
    } else {
      next = {
        ...resume,
        personalInfo: { ...resume.personalInfo, [e.target.name]: e.target.value },
      };
    }
    update(next);
  }, [resume, update]);

  const handlePhotoChange = useCallback((photoUrl: string) => {
    update({ ...resume, personalInfo: { ...resume.personalInfo, photo: photoUrl } });
  }, [resume, update]);

  const handleSummaryChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    update({ ...resume, summary: e.target.value });
  }, [resume, update]);

  const handleExperienceChange = useCallback((id: string, field: string, value: string | string[]) => {
    update({
      ...resume,
      experience: resume.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp),
    });
  }, [resume, update]);

  const addExperience = useCallback(() => {
    update({
      ...resume,
      experience: [...resume.experience, { id: Date.now().toString(), company: "", role: "", startDate: "", endDate: "", description: [] }],
    });
  }, [resume, update]);

  const removeExperience = useCallback((id: string) => {
    update({ ...resume, experience: resume.experience.filter(exp => exp.id !== id) });
  }, [resume, update]);

  const handleEducationChange = useCallback((id: string, field: string, value: string) => {
    update({
      ...resume,
      education: resume.education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu),
    });
  }, [resume, update]);

  const addEducation = useCallback(() => {
    update({
      ...resume,
      education: [...resume.education, { id: Date.now().toString(), school: "", degree: "", startDate: "", endDate: "" }],
    });
  }, [resume, update]);

  const removeEducation = useCallback((id: string) => {
    update({ ...resume, education: resume.education.filter(edu => edu.id !== id) });
  }, [resume, update]);

  const addSkill = useCallback(() => {
    if (!newSkill.trim() || resume.skills.includes(newSkill.trim())) return;
    if (resume.skills.length >= maxSkillCount) {
      setSkillsError(`Maximum of ${maxSkillCount} skills allowed to prevent resume layout overflow`);
      return;
    }
    setSkillsError("");
    const next = { ...resume, skills: [...resume.skills, newSkill.trim()] };
    setNewSkill("");
    update(next);
  }, [newSkill, resume, update]);

  const removeSkill = useCallback((skillToRemove: string) => {
    setSkillsError("");
    update({ ...resume, skills: resume.skills.filter(s => s !== skillToRemove) });
  }, [resume, update]);

  const addSkillFromSuggestion = useCallback((skill: string) => {
    if (resume.skills.includes(skill)) return;
    if (resume.skills.length >= maxSkillCount) {
      setSkillsError(`Maximum of ${maxSkillCount} skills allowed to prevent resume layout overflow`);
      return;
    }
    setSkillsError("");
    update({ ...resume, skills: [...resume.skills, skill] });
    setAiSuggestedSkills(prev => prev.filter(s => s !== skill));
  }, [resume, update]);

  const removeSuggestedSkill = useCallback((skill: string) => {
    setAiSuggestedSkills(prev => prev.filter(s => s !== skill));
  }, []);

  return {
    resume, setResume,
    newSkill, setNewSkill,
    aiSuggestedSkills, setAiSuggestedSkills,
    skillsError, setSkillsError,
    handlePersonalInfoChange,
    handlePhotoChange,
    handleSummaryChange,
    handleExperienceChange,
    addExperience,
    removeExperience,
    handleEducationChange,
    addEducation,
    removeEducation,
    addSkill,
    removeSkill,
    addSkillFromSuggestion,
    removeSuggestedSkill,
  };
}
