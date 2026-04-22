"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Download, Save, Layout, FileText, Briefcase, GraduationCap, Code, Plus, Trash2, Loader2, Sparkles, Check, Palette } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import html2pdf from 'html2pdf.js';
import { templates, type TemplateId } from '@/lib/templates';

interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  id: string;
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
}

interface ResumeContent {
  personalInfo: {
    name: string;
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    website: string;
  };
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
}

// Initial Empty Resume State
const initialResume: ResumeContent = {
  personalInfo: {
    name: "",
    jobTitle: "",
    email: "",
    phone: "",
    location: "",
    website: "",
  },
  summary: "",
  experience: [],
  education: [],
  skills: []
};

type Tab = "personal" | "summary" | "experience" | "education" | "skills";

function debounce(func: (...args: [string, ResumeContent]) => void, wait: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  const debounced = (...args: [string, ResumeContent]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
  
  (debounced as typeof debounced & { cancel: () => void }).cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
  
  return debounced as typeof debounced & { cancel: () => void };
}

export default function ResumeEditor() {
  const params = useParams();
  const resumeId = params.id as string;
  const { isLoaded, userId } = useAuth();
  const [resume, setResume] = useState(initialResume);
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<TemplateId>('modern');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratingFor, setAiGeneratingFor] = useState<string | null>(null);

  const callAI = async (type: string, data: Record<string, unknown>): Promise<string | string[]> => {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    });
    
    if (!response.ok) throw new Error('AI generation failed');
    const result = await response.json();
    return result.result;
  };

  const generateAISummary = async () => {
    setAiGenerating(true);
    setAiGeneratingFor("summary");
    try {
      const experienceYears = resume.experience.length > 0 
        ? resume.experience.reduce((acc, exp) => {
            const start = parseInt(exp.startDate?.replace(/\D/g, '') || '0');
            const end = exp.endDate?.toLowerCase() === 'present' ? new Date().getFullYear() : parseInt(exp.endDate?.replace(/\D/g, '') || '0');
            return acc + (end - start);
          }, 0)
        : 3;
      
      const result = await callAI('generateSummary', {
        jobTitle: resume.personalInfo.jobTitle || 'Professional',
        experience: Math.max(experienceYears, 1),
        skills: resume.skills,
      }) as string;
      
      setResume({ ...resume, summary: result });
      if (resumeId !== 'new') {
        setAutoSaveStatus("saving");
        debouncedAutoSave(title, { ...resume, summary: result });
      }
    } catch {
      setError("Failed to generate summary");
    } finally {
      setAiGenerating(false);
      setAiGeneratingFor(null);
    }
  };

  const improveSummary = async () => {
    if (!resume.summary) return;
    setAiGenerating(true);
    setAiGeneratingFor("improveSummary");
    try {
      const result = await callAI('improveSummary', { summary: resume.summary }) as string;
      setResume({ ...resume, summary: result });
      if (resumeId !== 'new') {
        setAutoSaveStatus("saving");
        debouncedAutoSave(title, { ...resume, summary: result });
      }
    } catch {
      setError("Failed to improve summary");
    } finally {
      setAiGenerating(false);
      setAiGeneratingFor(null);
    }
  };

  const generateAISkills = async () => {
    if (!resume.personalInfo.jobTitle) {
      setError("Please enter a job title first");
      return;
    }
    setAiGenerating(true);
    setAiGeneratingFor("skills");
    try {
      const result = await callAI('generateSkills', { jobTitle: resume.personalInfo.jobTitle }) as string[];
      const newSkills = [...new Set([...resume.skills, ...result])];
      setResume({ ...resume, skills: newSkills });
      if (resumeId !== 'new') {
        setAutoSaveStatus("saving");
        debouncedAutoSave(title, { ...resume, skills: newSkills });
      }
    } catch {
      setError("Failed to generate skills");
    } finally {
      setAiGenerating(false);
      setAiGeneratingFor(null);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      window.location.href = "/";
      return;
    }

    const loadResume = async () => {
      try {
        const response = await fetch(`/api/resumes/${resumeId}`);
        if (response.ok) {
          const data = await response.json();
          setResume(data.content);
          setTitle(data.title);
          setTemplate((data.template as TemplateId) || 'modern');
        } else if (response.status === 404) {
          setTitle("Untitled Resume");
        } else {
          setError("Failed to load resume");
        }
      } catch {
        setError("Failed to load resume");
      } finally {
        setLoading(false);
      }
    };

    if (resumeId) {
      loadResume();
    }
  }, [isLoaded, userId, resumeId]);

  const autoSave = useCallback(async (titleToSave: string, resumeToSave: typeof initialResume) => {
    if (resumeId === 'new') return;
    
    setAutoSaveStatus("saving");
    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleToSave, content: resumeToSave }),
      });

      if (!response.ok) {
        throw new Error('Auto-save failed');
      }
      
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    } catch {
      setAutoSaveStatus("error");
    }
  }, [resumeId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedAutoSave = useCallback(
    debounce((titleToSave: string, resumeToSave: typeof initialResume) => {
      autoSave(titleToSave, resumeToSave);
    }, 5000),
    [autoSave]
  );

  useEffect(() => {
    return () => {
      debouncedAutoSave.cancel();
    };
  }, [debouncedAutoSave]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (resumeId !== 'new') {
      setAutoSaveStatus("saving");
      debouncedAutoSave(newTitle, resume);
    }
  };

  const saveResume = async (showNotification = true) => {
    debouncedAutoSave.cancel();
    setSaving(true);
    setError("");
    try {
      const method = resumeId === 'new' ? 'POST' : 'PUT';
      const url = resumeId === 'new' ? '/api/resumes' : `/api/resumes/${resumeId}`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: resume, template }),
      });

      if (!response.ok) {
        throw new Error('Failed to save resume');
      }

      const data = await response.json();
      if (resumeId === 'new') {
        window.location.href = `/editor/${data._id}`;
      } else if (showNotification) {
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      }
    } catch {
      setError("Failed to save resume");
      setAutoSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const changeTemplate = (newTemplate: TemplateId) => {
    setTemplate(newTemplate);
    setShowTemplatePicker(false);
    if (resumeId !== 'new') {
      setAutoSaveStatus("saving");
      debouncedAutoSave(title, resume);
      saveResume(false);
    }
  };

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newResume = {
      ...resume,
      personalInfo: { ...resume.personalInfo, [e.target.name]: e.target.value }
    };
    setResume(newResume);
    if (resumeId !== 'new') {
      setAutoSaveStatus("saving");
      debouncedAutoSave(title, newResume);
    }
  };

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newResume = { ...resume, summary: e.target.value };
    setResume(newResume);
    if (resumeId !== 'new') {
      setAutoSaveStatus("saving");
      debouncedAutoSave(title, newResume);
    }
  };

  const handleExperienceChange = (id: string, field: string, value: string) => {
    const newResume = {
      ...resume,
      experience: resume.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    };
    setResume(newResume);
    if (resumeId !== 'new') {
      setAutoSaveStatus("saving");
      debouncedAutoSave(title, newResume);
    }
  };

  const addExperience = () => {
    const newResume = {
      ...resume,
      experience: [...resume.experience, { id: Date.now().toString(), company: "", role: "", startDate: "", endDate: "", description: "" }]
    };
    setResume(newResume);
    if (resumeId !== 'new') {
      setAutoSaveStatus("saving");
      debouncedAutoSave(title, newResume);
    }
  };

  const removeExperience = (id: string) => {
    const newResume = { ...resume, experience: resume.experience.filter(exp => exp.id !== id) };
    setResume(newResume);
    if (resumeId !== 'new') {
      setAutoSaveStatus("saving");
      debouncedAutoSave(title, newResume);
    }
  };

  const handleEducationChange = (id: string, field: string, value: string) => {
    const newResume = {
      ...resume,
      education: resume.education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu)
    };
    setResume(newResume);
    if (resumeId !== 'new') {
      setAutoSaveStatus("saving");
      debouncedAutoSave(title, newResume);
    }
  };

  const addEducation = () => {
    const newResume = {
      ...resume,
      education: [...resume.education, { id: Date.now().toString(), school: "", degree: "", startDate: "", endDate: "" }]
    };
    setResume(newResume);
    if (resumeId !== 'new') {
      setAutoSaveStatus("saving");
      debouncedAutoSave(title, newResume);
    }
  };

  const removeEducation = (id: string) => {
    const newResume = { ...resume, education: resume.education.filter(edu => edu.id !== id) };
    setResume(newResume);
    if (resumeId !== 'new') {
      setAutoSaveStatus("saving");
      debouncedAutoSave(title, newResume);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !resume.skills.includes(newSkill.trim())) {
      const newResume = { ...resume, skills: [...resume.skills, newSkill.trim()] };
      setResume(newResume);
      setNewSkill("");
      if (resumeId !== 'new') {
        setAutoSaveStatus("saving");
        debouncedAutoSave(title, newResume);
      }
    }
  };

  const removeSkill = (skillToRemove: string) => {
    const newResume = { ...resume, skills: resume.skills.filter(s => s !== skillToRemove) };
    setResume(newResume);
    if (resumeId !== 'new') {
      setAutoSaveStatus("saving");
      debouncedAutoSave(title, newResume);
    }
  };

  const exportPDF = () => {
    const element = document.querySelector('.resume-preview') as HTMLElement | null;
    if (element) {
      const opt = {
        margin: 1,
        filename: `${title || 'resume'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };
      html2pdf().set(opt).from(element).save();
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-1)]" />
          <p className="text-gray-500">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <p className="text-red-500">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Navbar */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-[var(--primary-1)] transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-4 w-px bg-gray-300"></div>
          <Input 
            value={title} 
            onChange={(e) => handleTitleChange(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 text-lg font-semibold px-0 w-64 bg-transparent"
            placeholder="Resume Title"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
              className="gap-1 text-xs border-[var(--primary-2)] text-[var(--primary-1)] hover:bg-[var(--primary-4)]"
            >
              <Palette className="h-3 w-3" />
              {templates.find(t => t.id === template)?.name || 'Modern'}
            </Button>
            {showTemplatePicker && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => changeTemplate(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 ${
                      template === t.id ? 'bg-[var(--primary-4)] text-[var(--primary-1)] font-medium' : 'text-gray-700'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {autoSaveStatus === "saving" && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
          {autoSaveStatus === "saved" && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          {autoSaveStatus === "error" && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              Save failed
            </span>
          )}
          <Button 
            variant="outline" 
            className="gap-2 border-[var(--primary-2)] text-[var(--primary-1)] hover:bg-[var(--primary-4)]"
            onClick={() => saveResume(true)}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button className="gap-2 bg-[var(--primary-1)] hover:bg-[var(--primary-2)] text-white" onClick={exportPDF}>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Editor Form */}
        <section className="w-[500px] flex flex-col bg-white border-r border-gray-200 shrink-0">
          {/* Form Navigation */}
          <div className="flex overflow-x-auto border-b border-gray-200 hide-scrollbar p-2 gap-1 bg-gray-50/50">
            {[
              { id: "personal", icon: FileText, label: "Details" },
              { id: "summary", icon: Layout, label: "Summary" },
              { id: "experience", icon: Briefcase, label: "Experience" },
              { id: "education", icon: GraduationCap, label: "Education" },
              { id: "skills", icon: Code, label: "Skills" },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id 
                      ? "bg-white text-[var(--primary-1)] shadow-sm border border-gray-200" 
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {activeTab === "personal" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Personal Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <Input name="name" value={resume.personalInfo.name} onChange={handlePersonalInfoChange} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-gray-700">Job Title</label>
                    <Input name="jobTitle" value={resume.personalInfo.jobTitle} onChange={handlePersonalInfoChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <Input name="email" value={resume.personalInfo.email} onChange={handlePersonalInfoChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <Input name="phone" value={resume.personalInfo.phone} onChange={handlePersonalInfoChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Location</label>
                    <Input name="location" value={resume.personalInfo.location} onChange={handlePersonalInfoChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Website / Link</label>
                    <Input name="website" value={resume.personalInfo.website} onChange={handlePersonalInfoChange} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "summary" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Professional Summary</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateAISummary}
                      disabled={aiGenerating}
                      className="gap-1 text-xs border-[var(--primary-2)] text-[var(--primary-1)] hover:bg-[var(--primary-4)]"
                    >
                      {aiGeneratingFor === "summary" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {aiGeneratingFor === "summary" ? "Generating..." : "Generate with AI"}
                    </Button>
                    {resume.summary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={improveSummary}
                        disabled={aiGenerating}
                        className="gap-1 text-xs border-[var(--primary-2)] text-[var(--primary-1)] hover:bg-[var(--primary-4)]"
                      >
                        {aiGeneratingFor === "improveSummary" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {aiGeneratingFor === "improveSummary" ? "Improving..." : "Improve"}
                      </Button>
                    )}
                  </div>
                </div>
                <textarea
                  className="w-full h-48 rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-1)]"
                  value={resume.summary}
                  onChange={handleSummaryChange}
                  placeholder="Write a brief summary about your professional background, or click 'Generate with AI' to let AI write it for you..."
                />
              </div>
            )}

            {activeTab === "experience" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Work Experience</h2>
                  <Button variant="outline" size="sm" onClick={addExperience} className="gap-2 border-[var(--primary-1)] text-[var(--primary-1)]">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                {resume.experience.map((exp, index) => (
                  <div key={exp.id} className="p-4 border border-gray-200 rounded-lg space-y-4 bg-gray-50/50">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Experience #{index + 1}</span>
                      <button onClick={() => removeExperience(exp.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs text-gray-500">Company Name</label>
                        <Input value={exp.company} onChange={(e) => handleExperienceChange(exp.id, "company", e.target.value)} />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs text-gray-500">Job Role</label>
                        <Input value={exp.role} onChange={(e) => handleExperienceChange(exp.id, "role", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500">Start Date</label>
                        <Input value={exp.startDate} onChange={(e) => handleExperienceChange(exp.id, "startDate", e.target.value)} placeholder="e.g. Jan 2020" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500">End Date</label>
                        <Input value={exp.endDate} onChange={(e) => handleExperienceChange(exp.id, "endDate", e.target.value)} placeholder="e.g. Present" />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs text-gray-500">Description</label>
                        <textarea className="w-full h-24 rounded-md border border-gray-300 p-3 text-sm" value={exp.description} onChange={(e) => handleExperienceChange(exp.id, "description", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "education" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Education</h2>
                  <Button variant="outline" size="sm" onClick={addEducation} className="gap-2 border-[var(--primary-1)] text-[var(--primary-1)]">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                {resume.education.map((edu, index) => (
                  <div key={edu.id} className="p-4 border border-gray-200 rounded-lg space-y-4 bg-gray-50/50">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">School/University #{index + 1}</span>
                      <button onClick={() => removeEducation(edu.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs text-gray-500">Institution Name</label>
                        <Input value={edu.school} onChange={(e) => handleEducationChange(edu.id, "school", e.target.value)} />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs text-gray-500">Degree/Field of Study</label>
                        <Input value={edu.degree} onChange={(e) => handleEducationChange(edu.id, "degree", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500">Start Year</label>
                        <Input value={edu.startDate} onChange={(e) => handleEducationChange(edu.id, "startDate", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500">End Year</label>
                        <Input value={edu.endDate} onChange={(e) => handleEducationChange(edu.id, "endDate", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "skills" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Technical Skills</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAISkills}
                    disabled={aiGenerating || !resume.personalInfo.jobTitle}
                    className="gap-1 text-xs border-[var(--primary-2)] text-[var(--primary-1)] hover:bg-[var(--primary-4)]"
                    title={!resume.personalInfo.jobTitle ? "Enter a job title first" : "Generate skills based on your job title"}
                  >
                    {aiGeneratingFor === "skills" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {aiGeneratingFor === "skills" ? "Generating..." : "AI Suggestions"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={newSkill} 
                    onChange={(e) => setNewSkill(e.target.value)} 
                    placeholder="e.g. React.js"
                    onKeyDown={(e) => e.key === "Enter" && addSkill()}
                  />
                  <Button onClick={addSkill} className="bg-[var(--primary-1)] hover:bg-[var(--primary-2)] text-white">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {resume.skills.map(skill => (
                    <div key={skill} className="px-3 py-1 bg-[var(--primary-4)] text-[var(--primary-1)] rounded-full flex items-center gap-2 font-medium text-sm">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="hover:text-red-500 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>

        {/* Right Side: Live Preview */}
        <section className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center border-l shadow-inner border-gray-200">
          {/* Resume A4 Paper Canvas */}
          <div className={`resume-preview w-[794px] min-h-[1123px] bg-white shadow-xl p-12 print:shadow-none print:w-full shrink-0 mb-8 self-start ${
            template === 'modern' ? 'font-sans' : template === 'classic' ? 'font-times' : template === 'minimal' ? 'font-sans text-sm' : 'font-mono'
          } text-gray-900 border border-gray-100`}>
            
            {/* Template: Modern (default) */}
            {template === 'modern' && (
              <>
                <header className="border-b-2 border-gray-800 pb-6 mb-6">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2 uppercase tracking-wide">{resume.personalInfo.name || "Your Name"}</h1>
                  <p className="text-xl text-gray-600 mb-4">{resume.personalInfo.jobTitle || "Your Title"}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    {resume.personalInfo.email && <span>{resume.personalInfo.email}</span>}
                    {resume.personalInfo.phone && <span>• {resume.personalInfo.phone}</span>}
                    {resume.personalInfo.location && <span>• {resume.personalInfo.location}</span>}
                    {resume.personalInfo.website && <span>• {resume.personalInfo.website}</span>}
                  </div>
                </header>

                {resume.summary && (
                  <section className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-3">Professional Summary</h2>
                    <p className="text-gray-800 leading-relaxed text-sm">{resume.summary}</p>
                  </section>
                )}

                {resume.experience.length > 0 && (
                  <section className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4 border-b pb-1">Experience</h2>
                    {resume.experience.map(exp => (
                      <div key={exp.id} className="mb-5">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-bold text-gray-900 text-base">{exp.role || "Job Role"}</h3>
                          <span className="text-sm text-gray-600">{exp.startDate} – {exp.endDate}</span>
                        </div>
                        <div className="text-gray-700 font-medium text-sm mb-2">{exp.company || "Company Name"}</div>
                        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                      </div>
                    ))}
                  </section>
                )}

                {resume.education.length > 0 && (
                  <section className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4 border-b pb-1">Education</h2>
                    {resume.education.map(edu => (
                      <div key={edu.id} className="mb-4">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-bold text-gray-900 text-base">{edu.school || "Institution Name"}</h3>
                          <span className="text-sm text-gray-600">{edu.startDate} – {edu.endDate}</span>
                        </div>
                        <div className="text-gray-800 text-sm">{edu.degree}</div>
                      </div>
                    ))}
                  </section>
                )}

                {resume.skills.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4 border-b pb-1">Skills</h2>
                    <div className="text-sm text-gray-800 leading-relaxed">
                      {resume.skills.join(" • ")}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Template: Classic */}
            {template === 'classic' && (
              <>
                <header className="text-center border-b-4 border-gray-800 pb-6 mb-6">
                  <h1 className="text-4xl font-serif text-gray-900 mb-2 uppercase">{resume.personalInfo.name || "Your Name"}</h1>
                  <p className="text-lg text-gray-700 mb-3">{resume.personalInfo.jobTitle || "Your Title"}</p>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-600">
                    {resume.personalInfo.email && <span>{resume.personalInfo.email}</span>}
                    {resume.personalInfo.phone && <span>{resume.personalInfo.phone}</span>}
                    {resume.personalInfo.location && <span>{resume.personalInfo.location}</span>}
                    {resume.personalInfo.website && <span>{resume.personalInfo.website}</span>}
                  </div>
                </header>

                {resume.summary && (
                  <section className="mb-6">
                    <h2 className="text-lg font-serif font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">PROFESSIONAL SUMMARY</h2>
                    <p className="text-gray-800 leading-relaxed text-sm">{resume.summary}</p>
                  </section>
                )}

                {resume.experience.length > 0 && (
                  <section className="mb-6">
                    <h2 className="text-lg font-serif font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">WORK EXPERIENCE</h2>
                    {resume.experience.map(exp => (
                      <div key={exp.id} className="mb-4">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-serif font-bold text-gray-900">{exp.role || "Job Role"}</h3>
                          <span className="text-sm text-gray-600">{exp.startDate} – {exp.endDate}</span>
                        </div>
                        <div className="text-gray-700 italic text-sm mb-1">{exp.company || "Company Name"}</div>
                        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                      </div>
                    ))}
                  </section>
                )}

                {resume.education.length > 0 && (
                  <section className="mb-6">
                    <h2 className="text-lg font-serif font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">EDUCATION</h2>
                    {resume.education.map(edu => (
                      <div key={edu.id} className="mb-3">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-serif font-bold text-gray-900">{edu.school || "Institution Name"}</h3>
                          <span className="text-sm text-gray-600">{edu.startDate} – {edu.endDate}</span>
                        </div>
                        <div className="text-gray-700 italic text-sm">{edu.degree}</div>
                      </div>
                    ))}
                  </section>
                )}

                {resume.skills.length > 0 && (
                  <section>
                    <h2 className="text-lg font-serif font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">SKILLS</h2>
                    <div className="text-sm text-gray-800">
                      {resume.skills.join(", ")}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Template: Minimal */}
            {template === 'minimal' && (
              <>
                <header className="mb-8">
                  <h1 className="text-3xl font-light text-gray-900 mb-1">{resume.personalInfo.name || "Your Name"}</h1>
                  <p className="text-base text-gray-500 mb-3">{resume.personalInfo.jobTitle || "Your Title"}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    {resume.personalInfo.email && <span>{resume.personalInfo.email}</span>}
                    {resume.personalInfo.phone && <span>{resume.personalInfo.phone}</span>}
                    {resume.personalInfo.location && <span>{resume.personalInfo.location}</span>}
                    {resume.personalInfo.website && <span>{resume.personalInfo.website}</span>}
                  </div>
                </header>

                {resume.summary && (
                  <section className="mb-6">
                    <p className="text-gray-700 leading-relaxed text-xs">
                      {resume.summary}
                    </p>
                  </section>
                )}

                {resume.experience.length > 0 && (
                  <section className="mb-6">
                    <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Experience</h2>
                    {resume.experience.map(exp => (
                      <div key={exp.id} className="mb-4 pl-3 border-l-2 border-gray-300">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-medium text-gray-900 text-sm">{exp.role || "Job Role"}</h3>
                          <span className="text-xs text-gray-500">{exp.startDate} – {exp.endDate}</span>
                        </div>
                        <div className="text-gray-600 text-xs mb-1">{exp.company || "Company Name"}</div>
                        <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                      </div>
                    ))}
                  </section>
                )}

                {resume.education.length > 0 && (
                  <section className="mb-6">
                    <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Education</h2>
                    {resume.education.map(edu => (
                      <div key={edu.id} className="mb-3 pl-3 border-l-2 border-gray-300">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-medium text-gray-900 text-sm">{edu.school || "Institution Name"}</h3>
                          <span className="text-xs text-gray-500">{edu.startDate} – {edu.endDate}</span>
                        </div>
                        <div className="text-gray-600 text-xs">{edu.degree}</div>
                      </div>
                    ))}
                  </section>
                )}

                {resume.skills.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Skills</h2>
                    <div className="text-xs text-gray-700 leading-relaxed">
                      {resume.skills.join(" / ")}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Template: Creative */}
            {template === 'creative' && (
              <>
                <header className="bg-gray-900 text-white p-8 -m-12 mb-8">
                  <h1 className="text-4xl font-bold mb-2 tracking-tight">{resume.personalInfo.name || "Your Name"}</h1>
                  <p className="text-lg text-gray-300 mb-4 font-mono">{resume.personalInfo.jobTitle || "Your Title"}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400 font-mono">
                    {resume.personalInfo.email && <span>{resume.personalInfo.email}</span>}
                    {resume.personalInfo.phone && <span>{resume.personalInfo.phone}</span>}
                    {resume.personalInfo.location && <span>{resume.personalInfo.location}</span>}
                    {resume.personalInfo.website && <span>{resume.personalInfo.website}</span>}
                  </div>
                </header>

                {resume.summary && (
                  <section className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-sm font-bold text-gray-900 mb-2">About Me</h2>
                    <p className="text-gray-700 leading-relaxed text-sm font-mono">{resume.summary}</p>
                  </section>
                )}

                {resume.experience.length > 0 && (
                  <section className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Experience</h2>
                    {resume.experience.map(exp => (
                      <div key={exp.id} className="mb-4 relative pl-6 border-l-2 border-[var(--primary-1)]">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[var(--primary-1)]"></div>
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-bold text-gray-900 text-base">{exp.role || "Job Role"}</h3>
                          <span className="text-xs text-gray-500 font-mono">{exp.startDate} – {exp.endDate}</span>
                        </div>
                        <div className="text-gray-600 font-medium text-sm mb-2">{exp.company || "Company Name"}</div>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                      </div>
                    ))}
                  </section>
                )}

                {resume.education.length > 0 && (
                  <section className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Education</h2>
                    {resume.education.map(edu => (
                      <div key={edu.id} className="mb-3 relative pl-6 border-l-2 border-[var(--primary-2)]">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[var(--primary-2)]"></div>
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-bold text-gray-900 text-sm">{edu.school || "Institution Name"}</h3>
                          <span className="text-xs text-gray-500 font-mono">{edu.startDate} – {edu.endDate}</span>
                        </div>
                        <div className="text-gray-600 text-sm">{edu.degree}</div>
                      </div>
                    ))}
                  </section>
                )}

                {resume.skills.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {resume.skills.map(skill => (
                        <span key={skill} className="px-3 py-1 bg-gray-900 text-white text-xs font-mono rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Education */}
            {resume.education.length > 0 && (
              <section className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4 border-b pb-1">Education</h2>
                {resume.education.map(edu => (
                  <div key={edu.id} className="mb-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-gray-900 text-base">{edu.school || "Institution Name"}</h3>
                      <span className="text-sm text-gray-600 font-sans">{edu.startDate} – {edu.endDate}</span>
                    </div>
                    <div className="text-gray-800 text-sm font-sans">{edu.degree}</div>
                  </div>
                ))}
              </section>
            )}

            {/* Skills */}
            {resume.skills.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4 border-b pb-1">Skills</h2>
                <div className="font-sans text-sm text-gray-800 leading-relaxed">
                  {resume.skills.join(" • ")}
                </div>
              </section>
            )}

          </div>
        </section>
      </main>
    </div>
  );
}
