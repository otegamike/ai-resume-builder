"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Download, Image as ImageIcon, Save, Layout, FileText, Briefcase, GraduationCap, Code, Plus, Trash2, Loader2, Sparkles, Check, Palette } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import html2pdf from 'html2pdf.js';
import { buildTemplateSrcDoc, normalizeTemplateId } from "@/lib/templateRenderer";
import { TEMPLATE_PAGE, type TemplateDefinition, type TemplateId } from "@/lib/templateCatalog";
import styles from "./page.module.css";

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
  const [template, setTemplate] = useState<TemplateId>("template1");
  const [templateDefinitions, setTemplateDefinitions] = useState<TemplateDefinition[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratingFor, setAiGeneratingFor] = useState<string | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const exportIframeRef = useRef<HTMLIFrameElement | null>(null);

  const selectedTemplate = useMemo(
    () => templateDefinitions.find((entry) => entry.id === template),
    [templateDefinitions, template]
  );

  const renderedTemplate = useMemo(() => {
    if (!selectedTemplate?.html) return "";
    return buildTemplateSrcDoc(selectedTemplate.html, resume);
  }, [resume, selectedTemplate]);

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
    const loadTemplates = async () => {
      try {
        const response = await fetch("/api/templates");
        if (!response.ok) {
          throw new Error("Failed to load templates");
        }

        const data: TemplateDefinition[] = await response.json();
        setTemplateDefinitions(data);
      } catch {
        setError("Failed to load templates");
      }
    };

    loadTemplates();
  }, []);

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
          setTemplate(normalizeTemplateId(data.template || "template1"));
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

  const getExportElement = () => {
    const iframeDocument = exportIframeRef.current?.contentDocument;
    return iframeDocument?.querySelector(".page") as HTMLElement | null;
  };

  const exportPDF = () => {
    const element = getExportElement();
    if (!element) return;

    const opt = {
      margin: 0,
      filename: `${title || "resume"}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "px" as const, format: [TEMPLATE_PAGE.widthPx, TEMPLATE_PAGE.heightPx] as [number, number], orientation: "portrait" as const }
    };
    html2pdf().set(opt).from(element).save();
  };

  const exportImage = () => {
    const element = getExportElement();
    if (!element) return;

    const worker = html2pdf().set({
      html2canvas: { scale: 2, useCORS: true }
    }).from(element).toCanvas();

    worker.get("canvas").then((canvas: HTMLCanvasElement) => {
      const link = document.createElement("a");
      link.download = `${title || "resume"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  if (!isLoaded || loading || templateDefinitions.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <Loader2 className={styles.loadingIcon} />
          <p className={styles.loadingText}>Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <p className={styles.errorText}>{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.navbar}>
        <div className={styles.navbarLeft}>
          <Link href="/dashboard" className={styles.backLink}>
            <ArrowLeft className={styles.backIcon} />
          </Link>
          <div className={styles.navbarDivider} />
          <Input 
            value={title} 
            onChange={(e) => handleTitleChange(e.target.value)}
            className={`${styles.input} ${styles.titleInput}`}
            placeholder="Resume Title"
          />
        </div>
        <div className={styles.navbarCenter}>
          <div className={styles.relative}>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
              className={styles.templateButton}
            >
              <Palette className={styles.aiButtonIcon} />
              {selectedTemplate?.name || "Template"}
            </Button>
            {showTemplatePicker && (
              <div className={styles.templateDropdown}>
                {templateDefinitions.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => changeTemplate(t.id)}
                    className={`${styles.templateOption} ${template === t.id ? styles.templateOptionActive : ''}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={styles.navbarRight}>
          {autoSaveStatus === "saving" && (
            <span className={styles.autoSaveStatus}>
              <Loader2 className={`${styles.autoSaveIcon} ${styles.loadingIcon}`} /> Saving...
            </span>
          )}
          {autoSaveStatus === "saved" && (
            <span className={`${styles.autoSaveStatus} ${styles.saved}`}>
              <Check className={styles.autoSaveIcon} /> Saved
            </span>
          )}
          {autoSaveStatus === "error" && (
            <span className={`${styles.autoSaveStatus} ${styles.errorText}`}>
              Save failed
            </span>
          )}
          <Button 
            variant="outline" 
            className={styles.saveButton}
            onClick={() => saveResume(true)}
            disabled={saving}
          >
            <Save className={styles.saveIcon} />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button className={styles.exportButton} onClick={exportPDF}>
            <Download className={styles.exportIcon} />
            Export PDF
          </Button>
          <Button variant="outline" className={styles.exportButton} onClick={exportImage}>
            <ImageIcon className={styles.exportIcon} />
            Export Image
          </Button>
        </div>
      </header>

      <main className={styles.mainWorkspace}>
        <section className={styles.editorSection}>
          <div className={styles.formNav}>
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
                  className={`${styles.formNavButton} ${activeTab === tab.id ? styles.formNavButtonActive : ''}`}
                >
                  <Icon className={styles.formNavIcon} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className={styles.formContent}>
            {activeTab === "personal" && (
              <div className={styles.formSection}>
                <h2 className={styles.formSectionTitle}>Personal Details</h2>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Full Name</label>
                    <Input name="name" value={resume.personalInfo.name} onChange={handlePersonalInfoChange} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label className={styles.formLabel}>Job Title</label>
                    <Input name="jobTitle" value={resume.personalInfo.jobTitle} onChange={handlePersonalInfoChange} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Email</label>
                    <Input name="email" value={resume.personalInfo.email} onChange={handlePersonalInfoChange} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Phone</label>
                    <Input name="phone" value={resume.personalInfo.phone} onChange={handlePersonalInfoChange} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Location</label>
                    <Input name="location" value={resume.personalInfo.location} onChange={handlePersonalInfoChange} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Website / Link</label>
                    <Input name="website" value={resume.personalInfo.website} onChange={handlePersonalInfoChange} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "summary" && (
              <div className={styles.formSection}>
                <div className={styles.formSectionHeader}>
                  <h2 className={styles.formSectionTitle}>Professional Summary</h2>
                  <div className={styles.aiButtons}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateAISummary}
                      disabled={aiGenerating}
                      className={styles.aiButton}
                    >
                      {aiGeneratingFor === "summary" ? <Loader2 className={`${styles.aiButtonIcon} ${styles.loadingIcon}`} /> : <Sparkles className={styles.aiButtonIcon} />}
                      {aiGeneratingFor === "summary" ? "Generating..." : "Generate with AI"}
                    </Button>
                    {resume.summary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={improveSummary}
                        disabled={aiGenerating}
                        className={styles.aiButton}
                      >
                        {aiGeneratingFor === "improveSummary" ? <Loader2 className={`${styles.aiButtonIcon} ${styles.loadingIcon}`} /> : <Sparkles className={styles.aiButtonIcon} />}
                        {aiGeneratingFor === "improveSummary" ? "Improving..." : "Improve"}
                      </Button>
                    )}
                  </div>
                </div>
                <textarea
                  className={styles.textarea}
                  value={resume.summary}
                  onChange={handleSummaryChange}
                  placeholder="Write a brief summary about your professional background, or click 'Generate with AI' to let AI write it for you..."
                />
              </div>
            )}

            {activeTab === "experience" && (
              <div className={styles.formSection}>
                <div className={styles.formSectionHeader}>
                  <h2 className={styles.formSectionTitle}>Work Experience</h2>
                  <Button variant="outline" size="sm" onClick={addExperience} className={styles.addButton}>
                    <Plus className={styles.addIcon} /> Add
                  </Button>
                </div>
                {resume.experience.map((exp, index) => (
                  <div key={exp.id} className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                      <span>Experience #{index + 1}</span>
                      <button onClick={() => removeExperience(exp.id)} className={`${styles.deleteButton} ${styles.deleteButton}`}>
                        <Trash2 className={styles.deleteIcon} />
                      </button>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                        <label className={styles.formLabelSmall}>Company Name</label>
                        <Input value={exp.company} onChange={(e) => handleExperienceChange(exp.id, "company", e.target.value)} />
                      </div>
                      <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                        <label className={styles.formLabelSmall}>Job Role</label>
                        <Input value={exp.role} onChange={(e) => handleExperienceChange(exp.id, "role", e.target.value)} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabelSmall}>Start Date</label>
                        <Input value={exp.startDate} onChange={(e) => handleExperienceChange(exp.id, "startDate", e.target.value)} placeholder="e.g. Jan 2020" />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabelSmall}>End Date</label>
                        <Input value={exp.endDate} onChange={(e) => handleExperienceChange(exp.id, "endDate", e.target.value)} placeholder="e.g. Present" />
                      </div>
                      <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                        <label className={styles.formLabelSmall}>Description</label>
                        <textarea className={styles.textarea} value={exp.description} onChange={(e) => handleExperienceChange(exp.id, "description", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "education" && (
              <div className={styles.formSection}>
                <div className={styles.formSectionHeader}>
                  <h2 className={styles.formSectionTitle}>Education</h2>
                  <Button variant="outline" size="sm" onClick={addEducation} className={styles.addButton}>
                    <Plus className={styles.addIcon} /> Add
                  </Button>
                </div>
                {resume.education.map((edu, index) => (
                  <div key={edu.id} className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                      <span>School/University #{index + 1}</span>
                      <button onClick={() => removeEducation(edu.id)} className={styles.deleteButton}>
                        <Trash2 className={styles.deleteIcon} />
                      </button>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                        <label className={styles.formLabelSmall}>Institution Name</label>
                        <Input value={edu.school} onChange={(e) => handleEducationChange(edu.id, "school", e.target.value)} />
                      </div>
                      <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                        <label className={styles.formLabelSmall}>Degree/Field of Study</label>
                        <Input value={edu.degree} onChange={(e) => handleEducationChange(edu.id, "degree", e.target.value)} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabelSmall}>Start Year</label>
                        <Input value={edu.startDate} onChange={(e) => handleEducationChange(edu.id, "startDate", e.target.value)} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabelSmall}>End Year</label>
                        <Input value={edu.endDate} onChange={(e) => handleEducationChange(edu.id, "endDate", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "skills" && (
              <div className={styles.formSection}>
                <div className={styles.formSectionHeader}>
                  <h2 className={styles.formSectionTitle}>Technical Skills</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAISkills}
                    disabled={aiGenerating || !resume.personalInfo.jobTitle}
                    className={styles.aiButton}
                    title={!resume.personalInfo.jobTitle ? "Enter a job title first" : "Generate skills based on your job title"}
                  >
                    {aiGeneratingFor === "skills" ? <Loader2 className={`${styles.aiButtonIcon} ${styles.loadingIcon}`} /> : <Sparkles className={styles.aiButtonIcon} />}
                    {aiGeneratingFor === "skills" ? "Generating..." : "AI Suggestions"}
                  </Button>
                </div>
                <div className={styles.skillsContainer}>
                  <Input 
                    value={newSkill} 
                    onChange={(e) => setNewSkill(e.target.value)} 
                    placeholder="e.g. React.js"
                    className={styles.skillsInput}
                    onKeyDown={(e) => e.key === "Enter" && addSkill()}
                  />
                  <Button onClick={addSkill} className={styles.skillsAddButton}>Add</Button>
                </div>
                <div className={styles.skillsList}>
                  {resume.skills.map(skill => (
                    <div key={skill} className={styles.skillTag}>
                      {skill}
                      <button onClick={() => removeSkill(skill)} className={`${styles.deleteButton} ${styles.skillRemoveButton}`}>
                        <Trash2 className={styles.skillRemoveIcon} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={styles.previewSection}>
          <div className={styles.previewCanvas}>
            <iframe
              ref={previewIframeRef}
              title="Resume preview"
              className={styles.previewFrame}
              srcDoc={renderedTemplate}
              sandbox="allow-same-origin"
            />
          </div>
          <iframe
            ref={exportIframeRef}
            title="Resume export"
            className={styles.exportFrame}
            srcDoc={renderedTemplate}
            sandbox="allow-same-origin"
          />
        </section>
      </main>
    </div>
  );
}
