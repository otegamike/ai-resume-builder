"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronsDown, ChevronsUp, ChevronUp, Download, Image as ImageIcon, Save, Layout, FileText, Briefcase, GraduationCap, Code, Plus, Trash2, Loader2, Sparkles, Check, Palette } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import html2pdf from 'html2pdf.js';
import { buildTemplateSrcDoc, normalizeTemplateId } from "@/lib/templateRenderer";
import { TEMPLATE_PAGE, type TemplateDefinition, type TemplateId } from "@/lib/templateCatalog";
import TemplateSelector from "./TemplateSelector";
import PersonalDetailsTab from "./form-nav/PersonalDetailsTab";
import HeadshotTab from "./form-nav/HeadshotTab";
import SummaryTab from "./form-nav/SummaryTab";
import ExperienceTab from "./form-nav/ExperienceTab";
import EducationTab from "./form-nav/EducationTab";
import SkillsTab from "./form-nav/SkillsTab";
import styles from "./page.module.css";
import { calculateEditorHeight, editorSectionHeight } from "@/utils/headerSize";
import { scrollIntoView } from "@/utils/scrollIntoview"; 
import { initialResume } from "@/constants/ResumeConstants";
import type { ResumeContent } from "@/types/ResumeData";
import { useSearchParams } from 'next/navigation';
import { useAi } from "@/app/hooks/useAi";
import { useAutoSave } from "@/app/hooks/useAutosave";

type Tab = "headshot" | "personal" | "summary" | "experience" | "education" | "skills";

interface TabItem {
  id: Tab;
  icon: any;
  label: string;
}

const tabArray: TabItem[] = [
  { id: "personal", icon: FileText, label: "Personal Details" },
  { id: "headshot", icon: ImageIcon, label: "Headshot" },
  { id: "experience", icon: Briefcase, label: "Work Experience" },
  { id: "education", icon: GraduationCap, label: "Education" },
  { id: "skills", icon: Code, label: "Skills" },
  { id: "summary", icon: Layout, label: "Summary" },
];

const editorHeight = calculateEditorHeight();
const SectionHeight = editorSectionHeight();


export default function ResumeEditor() {
  const params = useParams();
  const searchParams = useSearchParams();
  const templateParams = searchParams.get('template');
  

  const initialResumeId = params.id as string;
  const initialTemplateId = "template1";

  const { status } = useSession();
  const [resume, setResume] = useState(initialResume);
  const [title, setTitle] = useState("");
  const [templateDefinitions, setTemplateDefinitions] = useState<TemplateDefinition[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const exportIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isEditorTabOpen, setIsEditorTabOpen] = useState(true);

  
  const { 
    aiGenerating, 
    aiGeneratingFor, 
    aiError, 
    generateAiSummary, 
    improveAiSummary, 
    generateAiSkills, 
    generateAiBulletPoints 
  } = useAi();

  const {
    resumeId,
    templateId,
    saving,
    autoSaveStatus,
    debouncedAutoSave,
    saveResume,
    updateResumeId,
    updateTemplateId,
    setAutoSaveStatus,
  } = useAutoSave(initialResumeId, initialTemplateId, 5000 );


  // editor open and close
  const toggleEditorTab = () => {
    setIsEditorTabOpen(!isEditorTabOpen);
  }

  const saveDraft = useCallback(() => {
    saveResume(title, resume);
  }, [title, resume, saveResume]);

  const saveTemplate = useCallback((newTemplateId: TemplateId) => {
    saveResume(title, resume, newTemplateId);
  }, [title, resume, saveResume]);

  const [showExportOption, setShowExportOption] = useState<boolean>(false);

  const selectedTemplate = useMemo(
    () => templateDefinitions.find((entry) => entry.id === templateId),
    [templateDefinitions, templateId]
  );

  const renderedTemplate = useMemo(() => {
    if (!selectedTemplate?.html) return "";
    return buildTemplateSrcDoc(selectedTemplate.html, resume);
  }, [resume, selectedTemplate]);

  useEffect(() => {
    const iframe = exportIframeRef.current;
    if (iframe) {
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(renderedTemplate);
        doc.close();
      }
    }
  }, [renderedTemplate]);

  const generateSummary = async () => {
      const result = await generateAiSummary(resume);
      if (!result.success){
        return;
      }

      const summary = result.text;
      debouncedAutoSave(title, { ...resume, summary });
      setResume({ ...resume, summary });
  };

  const improveSummary = async () => {
    const result = await improveAiSummary(resume.summary);
    if (!result.success) {
      return;
    }

    const summary = result.text;
    setResume({ ...resume, summary });
    debouncedAutoSave(title, { ...resume, summary });
  };

  const generateBulletPoints = async (index: number) => {
    const result = await generateAiBulletPoints(resume.experience[index], index);
    if (!result.success) {
      return;
    }

    const bulletPoints = result.array;
    const newExperience = [...resume.experience];
    newExperience[index] = { ...newExperience[index], description: bulletPoints };
    setResume({ ...resume, experience: newExperience });
    debouncedAutoSave(title, { ...resume, experience: newExperience });
  };

  const generateAISkills = async () => {
    if (!resume.personalInfo.jobTitle) {
      setError("Please enter a job title first");
      return;
    }
    const result = await generateAiSkills(resume.personalInfo.jobTitle);
    if (!result.success) {
      return;
    }

    const skills = result.array;
    const newSkills = [...new Set([...resume.skills, ...skills])];
    setResume({ ...resume, skills: newSkills });
    debouncedAutoSave(title, { ...resume, skills: newSkills });
    
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

        if(templateParams){
          const template = data.find((entry) => entry.id === templateParams);
          if (template) {
            updateTemplateId(template.id);
          }
        }

      } catch {
        setError("Failed to load templates");
      }
    };

    loadTemplates();
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
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
          updateTemplateId(normalizeTemplateId(data.template || "template1"));
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
  }, [status, resumeId]);
 
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (resumeId !== 'new') {
      setAutoSaveStatus("saving");
      debouncedAutoSave(newTitle, resume);
    }
  };

  // Tabswitching functions

  const getTabIndex = (tab: Tab): number => {
    return tabArray.findIndex(({id}) => id == tab);
  }

  const getTabId = (tabIndex: number): Tab => {
    if (tabIndex >= tabArray.length || tabIndex < 0) {
      console.error("Invalid tab index");
      return tabArray[0].id;
    }
    return tabArray[tabIndex].id;
  }

  const scrollToTab = (tabId : Tab) => {
    scrollIntoView('formNavBar', `tab-${tabId}`)
  }

  const changeTab = (newTab: Tab | "next" | "prev") => {
    if (newTab == "next") {
      const tabIndex = getTabIndex(activeTab);
      if (tabIndex < tabArray.length - 1) {
        const newTabId = getTabId(tabIndex + 1);
        scrollToTab(newTabId);
        setActiveTab(newTabId);
      }
    } else if (newTab == "prev") {
      const tabIndex = getTabIndex(activeTab);
      if (tabIndex > 0) {
        const newTabId = getTabId(tabIndex - 1);
        scrollToTab(newTabId);
        setActiveTab(newTabId);
      }
    } else {
      scrollToTab(newTab);
      setActiveTab(newTab);
    }
  };

  // Template functions

  const toggleTemplatePicker = () => {
    setShowTemplatePicker(!showTemplatePicker);
  };

  const changeTemplate = (newTemplate: TemplateId) => {
    updateTemplateId(newTemplate);
    setShowTemplatePicker(false);
    saveTemplate(newTemplate);
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

  const handlePhotoChange = (photoUrl: string) => {
    const newResume = {
      ...resume,
      personalInfo: { ...resume.personalInfo, photo: photoUrl }
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

  const handleExperienceChange = (id: string, field: string, value: string | string[]) => {
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
      experience: [...resume.experience, { id: Date.now().toString(), company: "", role: "", startDate: "", endDate: "", description: [] }]
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
    return iframeDocument?.documentElement as HTMLElement | null;
  };

  const exportPDF = async () => {
    console.log("Exporting PDF...");
    const element = getExportElement();
    const iframeWindow = exportIframeRef.current?.contentWindow;
    if (!element || !iframeWindow) return;

    // Optional: wait a moment to ensure fonts are loaded
    await new Promise(r => setTimeout(r, 500));

    const html2canvasOptions = {
      scale: 2,
      useCORS: true,
      logging: true,
      onclone: (clonedDoc: Document) => {
        const images = clonedDoc.querySelectorAll('img');
        images.forEach((img) => {
          const computedStyle = clonedDoc.defaultView?.getComputedStyle(img);
          const div = clonedDoc.createElement('div');
          div.style.backgroundImage = `url("${img.src}")`;
          div.style.backgroundSize = 'cover';
          div.style.backgroundPosition = 'center';
          
          if (computedStyle) {
            div.style.width = computedStyle.width !== 'auto' ? computedStyle.width : (img.width + 'px');
            div.style.height = computedStyle.height !== 'auto' ? computedStyle.height : (img.height + 'px');
            div.style.borderRadius = computedStyle.borderRadius;
            div.style.border = computedStyle.border;
            div.style.margin = computedStyle.margin;
            div.style.display = computedStyle.display !== 'inline' ? computedStyle.display : 'block';
          } else {
            div.style.width = img.width + 'px';
            div.style.height = img.height + 'px';
            div.style.display = 'block';
          }
          
          div.className = img.className;
          img.replaceWith(div);
        });
      }
    };

    const opt = {
      margin: 0,
      filename: `${title || "resume"}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: html2canvasOptions,
      jsPDF: { unit: "px" as const, format: [TEMPLATE_PAGE.widthPx, TEMPLATE_PAGE.heightPx] as [number, number], orientation: "portrait" as const }
    };
    html2pdf().set(opt).from(element).save();
  };

  const exportImage = async () => {
    const element = getExportElement();
    const iframeWindow = exportIframeRef.current?.contentWindow;
    if (!element || !iframeWindow) return;

    await new Promise(r => setTimeout(r, 500));

    const html2canvasOptions = {
      scale: 2,
      useCORS: true,
      logging: true,
      onclone: (clonedDoc: Document) => {
        const images = clonedDoc.querySelectorAll('img');
        images.forEach((img) => {
          const computedStyle = clonedDoc.defaultView?.getComputedStyle(img);
          const div = clonedDoc.createElement('div');
          div.style.backgroundImage = `url("${img.src}")`;
          div.style.backgroundSize = 'cover';
          div.style.backgroundPosition = 'center';
          
          if (computedStyle) {
            div.style.width = computedStyle.width !== 'auto' ? computedStyle.width : (img.width + 'px');
            div.style.height = computedStyle.height !== 'auto' ? computedStyle.height : (img.height + 'px');
            div.style.borderRadius = computedStyle.borderRadius;
            div.style.border = computedStyle.border;
            div.style.margin = computedStyle.margin;
            div.style.display = computedStyle.display !== 'inline' ? computedStyle.display : 'block';
          } else {
            div.style.width = img.width + 'px';
            div.style.height = img.height + 'px';
            div.style.display = 'block';
          }
          
          div.className = img.className;
          img.replaceWith(div);
        });
      }
    };

    const worker = html2pdf().set({
      html2canvas: html2canvasOptions
    }).from(element).toCanvas();

    worker.get("canvas").then((canvas: HTMLCanvasElement) => {
      const link = document.createElement("a");
      link.download = `${title || "resume"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  if (status === "loading" || loading || templateDefinitions.length === 0) {
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
    <div className={styles.container} style={{height: editorHeight}}>
      <div className={styles.title_bar} id="title_bar">
        <div className={styles.navbarLeft}>
          <Link href="/dashboard" className={styles.backLink}>
            <ArrowLeft color='var(--neutral-100)' className={styles.backIcon} />
          </Link>
          <div className={styles.navbarDivider} />
          <Input 
            value={title} 
            onChange={(e) => handleTitleChange(e.target.value)}
            className={`${styles.input} ${styles.titleInput}`}
            placeholder="Resume Title"
          />

          <TemplateSelector 
            templateDefinitions={templateDefinitions} 
            template={templateId} 
            selectedTemplate={selectedTemplate} 
            changeTemplate={changeTemplate} 
            showTemplatePicker={showTemplatePicker} 
            toggleTemplatePicker={toggleTemplatePicker}
          />
        </div>
        
        <div className={styles.navbarCenter}>
          
          
        </div>
        <div className={styles.navbarRight}>
          {autoSaveStatus === "saving" && (
            <span className={styles.autoSaveStatus}>
              <Loader2 className={`${styles.autoSaveIcon} ${styles.loadingIcon}`} color='var(--neutral-100)' size={12} /> 
              <div className={styles.buttonText}>Saving...</div>
            </span>
          )}
          {autoSaveStatus === "saved" && (
            <span className={`${styles.autoSaveStatus} ${styles.saved}`}>
              <Check className={styles.autoSaveIcon} /> 
              <div className={styles.buttonText}>Saved</div>
            </span>
          )}
          {autoSaveStatus === "error" && (
            <span className={`${styles.autoSaveStatus} ${styles.errorText}`}>
              Save failed
            </span>
          )}
          <Button 
            variant="light_outline" 
            className={styles.saveButton}
            onClick={() => saveDraft()}
            disabled={saving}
          >
            <Save color='var(--neutral-100)' className={styles.saveIcon} />
            <div className={styles.buttonText}>{saving ? 'Saving...' : 'Save Draft'}</div>
          </Button>

          <div className={styles.relative}>
            <Button className={styles.exportButton} onClick={() => {setShowExportOption(!showExportOption)}}>
              <Download color='var(--neutral-100)' className={styles.exportIcon} />
              <div className={styles.buttonText}>Export</div>
              {showExportOption ? 
                <ChevronUp color='var(--neutral-100)' className={styles.aiButtonIcon} /> 
                : <ChevronDown color='var(--neutral-100)' className={styles.aiButtonIcon} />
              }
            </Button>

              {
                showExportOption && 
                <div className={styles.dropdown}>
                  <button
                    onClick={() => exportPDF()}
                    className={`${styles.dropdown_option} ${styles.export_option}`}
                  >
                    <Download className={styles.exportIcon} />
                    Export PDF
                  </button>
                  <button
                    onClick={() => exportImage()}
                    className={`${styles.dropdown_option} ${styles.export_option}`}
                  >
                    <ImageIcon className={styles.exportIcon} />
                    Export Image
                  </button>
                </div>
              }
            
          </div>
          
        </div>
      </div>



      <div className={styles.mainWorkspaceContainer}>
        <main className={styles.mainWorkspace}>
          <section className={`${isEditorTabOpen? "" : styles.closeSection} ${styles.editorSection} hideScrollbar`} style={{height: SectionHeight}}>
            <div className={styles.formNav}>
              <div id='formNavBar' className={`${styles.formNavContent} hideScrollbar`}>
                {tabArray.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      id={`tab-${tab.id}`}
                      onClick={() => changeTab(tab.id)}
                      className={`${styles.formNavButton} ${activeTab === tab.id ? styles.formNavButtonActive : ''}`}
                    >
                      <Icon className={styles.formNavIcon} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className={styles.formContent}>
              {activeTab === "headshot" && (
                <HeadshotTab
                  photo={resume.personalInfo.photo}
                  onChange={handlePhotoChange}
                />
              )}

              {activeTab === "personal" && (
                <PersonalDetailsTab
                  personalInfo={resume.personalInfo}
                  onChange={handlePersonalInfoChange}
                />
              )}

              {activeTab === "summary" && (
                <SummaryTab
                  summary={resume.summary}
                  onChange={handleSummaryChange}
                  generateAISummary={generateSummary}
                  improveSummary={improveSummary}
                  aiGenerating={aiGenerating}
                  aiGeneratingFor={aiGeneratingFor}
                />
              )}

              {activeTab === "experience" && (
                <ExperienceTab
                  experience={resume.experience}
                  addExperience={addExperience}
                  removeExperience={removeExperience}
                  onChange={handleExperienceChange}
                  generateBulletPoints={generateBulletPoints}
                  aiGeneratingFor={aiGeneratingFor}
                />
              )}

              {activeTab === "education" && (
                <EducationTab
                  education={resume.education}
                  addEducation={addEducation}
                  removeEducation={removeEducation}
                  onChange={handleEducationChange}
                />
              )}

              {activeTab === "skills" && (
                <SkillsTab
                  skills={resume.skills}
                  jobTitle={resume.personalInfo.jobTitle}
                  newSkill={newSkill}
                  setNewSkill={setNewSkill}
                  addSkill={addSkill}
                  removeSkill={removeSkill}
                  generateAISkills={generateAISkills}
                  aiGenerating={aiGenerating}
                  aiGeneratingFor={aiGeneratingFor}
                />
              )}

              <div className={styles.navFormFooter}>
                <div className={styles.paginationIndicator}>
                  {tabArray.map((tabItem) => { 
                    return(
                      <div key={`dot-${tabItem.id}`} onClick={() => changeTab(tabItem.id)} className={`${styles.dot} ${activeTab===tabItem.id?styles.active: ""} `}></div>
                    )
                  })}
                </div>
                <div className={styles.tabNavigation}>
                  <Button variant="outline" className={styles.previousButton} disabled={getTabIndex(activeTab) === 0} onClick={() => changeTab("prev")}>
                    <ArrowLeft className={styles.tabNavigationIcon} />
                    Previous
                  </Button>
                  
                  <Button className={styles.nextButton} disabled={getTabIndex(activeTab) === tabArray.length - 1} onClick={() => changeTab("next")}>
                    Next
                    <ArrowRight className={styles.tabNavigationIcon} />
                  </Button>
                </div>
                <div
                  onClick={() => toggleEditorTab()}
                  className={`${styles.closeSectionButton} ${resume.summary?styles.completed: ""}`}
                >
                  {isEditorTabOpen? 'View Resume' : 'Edit Resume'}
                  <div className={`${styles.arrow} ${isEditorTabOpen? styles.flipArrow: ""}`}>
                    <ChevronsUp className={styles.bounce} color="var(--ai-accent-100)" />
                  </div>
                </div>
              </div>
            </div>
            
          </section>

          <section className={styles.previewSection}>
            <div className={styles.previewCanvas}>
              <iframe
                ref={previewIframeRef}
                title="Resume preview"
                className={styles.previewFrame}
                srcDoc={renderedTemplate}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            <iframe
              ref={exportIframeRef}
              title="Resume export"
              className={styles.exportFrame}
              sandbox="allow-same-origin"
            />
          </section>
        </main>
      </div>
    </div>
  );
}
