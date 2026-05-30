"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronsUp, ChevronUp,
  Download, Image as ImageIcon, Save, Loader2, Check,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { buildTemplateSrcDoc, normalizeTemplateId } from "@/lib/templateRenderer";
import { type TemplateDefinition, type TemplateId } from "@/lib/templateCatalog";
import TemplateSelector from "./TemplateSelector";
import PersonalDetailsTab from "./form-nav/PersonalDetailsTab";
import HeadshotTab from "./form-nav/HeadshotTab";
import SummaryTab from "./form-nav/SummaryTab";
import ExperienceTab from "./form-nav/ExperienceTab";
import EducationTab from "./form-nav/EducationTab";
import SkillsTab from "./form-nav/SkillsTab";
import FinishTab from "./form-nav/FinishTab";
import styles from "./page.module.css";
import { calculateEditorHeight, editorSectionHeight } from "@/utils/headerSize";

import { useAi } from "@/app/hooks/useAi";
import { useAutoSave } from "@/app/hooks/useAutosave";
import { useResumeForm } from "@/app/hooks/useResumeForm";
import { useTabNavigation, TAB_ARRAY, type Tab } from "@/app/hooks/useTabNavigation";
import { exportResumeAsPdf, exportResumeAsImage } from "@/utils/exportUtils";
import { addRecentlyUsedTemplate } from "@/utils/templateStorage";
import type { ResumeContent } from "@/types/ResumeData";
import ResumeIframe from "@/components/resume/ResumeIframe";
import LoadingComponent from "@/components/ui/LoadingComponent";

export default function ResumeEditor() {
  const params = useParams();
  const searchParams = useSearchParams();
  const templateParams = searchParams.get("template");
  const { status } = useSession();

  const initialResumeId = params.id as string;
  const [title, setTitle] = useState("");

  const [isExporting, setIsExporting] = useState(false);
  const [templateDefinitions, setTemplateDefinitions] = useState<TemplateDefinition[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showExportOption, setShowExportOption] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const exportIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isEditorTabOpen, setIsEditorTabOpen] = useState(true);

  const {
    aiGenerating, aiGeneratingFor,
    generateAiSummary, improveAiSummary, generateAiSkills, generateAiBulletPoints,
  } = useAi();

  const {
    resumeId, templateId, saving, autoSaveStatus,
    debouncedAutoSave, saveResume, updateTemplateId, setAutoSaveStatus,
  } = useAutoSave(initialResumeId, "template1", 5000);

  const { activeTab, changeTab, getTabIndex } = useTabNavigation();

  const autoSaveChanges = useCallback((next: ResumeContent) => {
    if (resumeId !== "new") {
      setAutoSaveStatus("saving");
      debouncedAutoSave(title, next);
    }
  }, [resumeId, title, debouncedAutoSave, setAutoSaveStatus]);

  const form = useResumeForm(autoSaveChanges);
  const { resume, setResume, newSkill, setNewSkill, aiSuggestedSkills, setAiSuggestedSkills, skillsError, setSkillsError } = form;

  const [showLoader, setShowLoader] = useState(true);

  const toggleShowLoader = (toggle?: boolean) => {
    setShowLoader((prev) => toggle ?? !prev);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (resumeId !== "new") {
      setAutoSaveStatus("saving");
      debouncedAutoSave(newTitle, resume);
    }
  };

  const toggleEditorTab = () => {
    setIsEditorTabOpen((prev) => !prev);
  };

  const saveDraft = useCallback(() => {
    saveResume(title, resume);
  }, [title, resume, saveResume]);

  const saveTemplate = useCallback((newTemplateId: TemplateId) => {
    saveResume(title, resume, newTemplateId);
  }, [title, resume, saveResume]);

  const selectedTemplate = useMemo(
    () => templateDefinitions.find((entry) => entry.id === templateId),
    [templateDefinitions, templateId],
  );

  const renderedTemplate = useMemo(() => {
    if (!selectedTemplate?.html) return "";
    return buildTemplateSrcDoc(selectedTemplate.html, resume, { editorMode: true });
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

  useEffect(() => {
    toggleShowLoader(true);
  }, [templateId]);


  const generateSummary = async () => {
    const result = await generateAiSummary(resume);
    if (!result.success) return;
    const summary = result.text;
    debouncedAutoSave(title, { ...resume, summary });
    setResume({ ...resume, summary });
  };

  const improveSummary = async () => {
    const result = await improveAiSummary(resume.summary);
    if (!result.success) return;
    const summary = result.text;
    setResume({ ...resume, summary });
    debouncedAutoSave(title, { ...resume, summary });
  };

  const generateBulletPoints = async (index: number) => {
    const result = await generateAiBulletPoints(resume.experience[index], index);
    if (!result.success) return;
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
    if (!result.success) return;
    const skills = result.array;
    const unseenSkills = skills.filter((s: string) => !resume.skills.includes(s));
    setAiSuggestedSkills(unseenSkills);
  };

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch("/api/templates");
        if (!response.ok) throw new Error("Failed to load templates");
        const data: TemplateDefinition[] = await response.json();
        setTemplateDefinitions(data);
        if (templateParams) {
          const found = data.find((entry) => entry.id === templateParams);
          if (found) updateTemplateId(found.id);
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
    if (resumeId) loadResume();
  }, [status, resumeId]);

  const toggleTemplatePicker = (toggle?: boolean) => {
    setShowTemplatePicker(toggle ?? !showTemplatePicker);
  };

  const changeTemplate = (newTemplate: TemplateId) => {
    updateTemplateId(newTemplate);
    setShowTemplatePicker(false);
    saveTemplate(newTemplate);
  };

  const exportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportResumeAsPdf(resume, templateId, title)
    } catch (exportError) {
      console.error("Failed to export PDF:", exportError);
      window.alert(exportError instanceof Error ? exportError.message : "Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  }, [resume, templateId, title]);

  const exportImage = useCallback(() => {
    setIsExporting(true);
    exportResumeAsImage(exportIframeRef, title).finally(() => {
      setIsExporting(false);
    });
  }, [title]);

  useEffect(() => {
    if (templateDefinitions.length > 0 && templateId) {
      const tpl = templateDefinitions.find((t) => t.id === templateId);
      if (tpl) addRecentlyUsedTemplate(templateId, tpl.name);
    }
  }, [templateId, templateDefinitions]);

  const editorHeight = useMemo(() => calculateEditorHeight(), []);
  const sectionHeight = useMemo(() => editorSectionHeight(), []);

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
    <div className={styles.container} style={{ height: editorHeight }}>
      <div className={styles.title_bar} id="title_bar">
        <div className={styles.navbarLeft}>
          <Link href="/dashboard" className={styles.backLink}>
            <ArrowLeft color="var(--neutral-100)" className={styles.backIcon} />
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

        <div className={styles.navbarCenter} />

        <div className={styles.navbarRight}>
          {autoSaveStatus === "saving" && (
            <span className={styles.autoSaveStatus}>
              <Loader2 className={`${styles.autoSaveIcon} ${styles.loadingIcon}`} color="var(--neutral-100)" size={12} />
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
            <Save color="var(--neutral-100)" className={styles.saveIcon} />
            <div className={styles.buttonText}>{saving ? "Saving..." : "Save Draft"}</div>
          </Button>

          <div className={styles.relative} onMouseEnter={() => setShowExportOption(true)} onMouseLeave={() => setShowExportOption(false)}>
            <Button className={styles.exportButton}>
              <Download color="var(--neutral-100)" className={styles.exportIcon} />
              <div className={styles.buttonText}>Export</div>
              {showExportOption
                ? <ChevronUp color="var(--neutral-100)" className={styles.aiButtonIcon} />
                : <ChevronDown color="var(--neutral-100)" className={styles.aiButtonIcon} />
              }
            </Button>
            {showExportOption && (
              <div className={styles.dropdown}>
                <button onClick={() => exportPDF()} className={`${styles.dropdown_option} ${styles.export_option}`} disabled={isExporting || saving}>
                  <Download className={styles.exportIcon} />
                  Export PDF
                </button>
                <button onClick={() => exportImage()} className={`${styles.dropdown_option} ${styles.export_option}`} disabled={isExporting || saving}>
                  <ImageIcon className={styles.exportIcon} />
                  Export Image
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.mainWorkspaceContainer}>
        <main className={styles.mainWorkspace}>
          <section className={`${isEditorTabOpen ? "" : styles.closeSection} ${styles.editorSection} hideScrollbar`} style={{ height: sectionHeight }}>
            <div className={styles.formNav}>
              <div id="formNavBar" className={`${styles.formNavContent} hideScrollbar`}>
                {TAB_ARRAY.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      id={`tab-${tab.id}`}
                      onClick={() => changeTab(tab.id)}
                      className={`${styles.formNavButton} ${activeTab === tab.id ? styles.formNavButtonActive : ""}`}
                    >
                      <Icon className={styles.formNavIcon} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formContent}>
              {activeTab === "headshot" && (
                <HeadshotTab photo={resume.personalInfo.photo} onChange={form.handlePhotoChange} />
              )}
              {activeTab === "personal" && (
                <PersonalDetailsTab personalInfo={resume.personalInfo} onChange={form.handlePersonalInfoChange} />
              )}
              {activeTab === "summary" && (
                <SummaryTab
                  summary={resume.summary}
                  onChange={form.handleSummaryChange}
                  generateAISummary={generateSummary}
                  improveSummary={improveSummary}
                  aiGenerating={aiGenerating}
                  aiGeneratingFor={aiGeneratingFor}
                />
              )}
              {activeTab === "experience" && (
                <ExperienceTab
                  experience={resume.experience}
                  addExperience={form.addExperience}
                  removeExperience={form.removeExperience}
                  onChange={form.handleExperienceChange}
                  generateBulletPoints={generateBulletPoints}
                  aiGeneratingFor={aiGeneratingFor}
                />
              )}
              {activeTab === "education" && (
                <EducationTab
                  education={resume.education}
                  addEducation={form.addEducation}
                  removeEducation={form.removeEducation}
                  onChange={form.handleEducationChange}
                />
              )}
              {activeTab === "skills" && (
                <SkillsTab
                  skills={resume.skills}
                  aiSuggestedSkills={aiSuggestedSkills}
                  jobTitle={resume.personalInfo.jobTitle}
                  newSkill={newSkill}
                  setNewSkill={setNewSkill}
                  addSkill={form.addSkill}
                  removeSkill={form.removeSkill}
                  addSkillFromSuggestion={form.addSkillFromSuggestion}
                  removeSuggestedSkill={form.removeSuggestedSkill}
                  generateAISkills={generateAISkills}
                  aiGenerating={aiGenerating}
                  aiGeneratingFor={aiGeneratingFor}
                  skillsError={skillsError}
                  setSkillsError={setSkillsError}
                />
              )}
              {activeTab === "finish" && (
                <FinishTab changeTab={changeTab} />
              )}

              <div className={styles.navFormFooter}>
                {activeTab === "finish" ? (
                  <Button className={styles.finalExportButton} size="lg" onClick={() => exportPDF()}>
                    Export Resume
                    <Download color="var(--neutral-100)" className={styles.exportIcon} />
                  </Button>
                ) : (
                  <NavigationPanel changeTab={changeTab} activeTab={activeTab} getTabIndex={getTabIndex} />
                )}

                <div
                  onClick={() => toggleEditorTab()}
                  className={`${styles.closeSectionButton} ${resume.summary ? styles.completed : ""}`}
                >
                  {isEditorTabOpen ? "View Resume" : "Edit Resume"}
                  <div className={`${styles.arrow} ${isEditorTabOpen ? styles.flipArrow : ""}`}>
                    <ChevronsUp className={styles.bounce} color="var(--ai-accent-100)" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.previewSection}>
            <ResumeIframe
              iframeRef={previewIframeRef}
              type="preview"
              renderedTemplate={renderedTemplate}
              editorMode={true}
              loaderObj={{ showLoader, toggleShowLoader }}
            />
            <iframe
              ref={exportIframeRef}
              title="Resume export"
              className={styles.exportFrame}
              sandbox="allow-same-origin"
            />
          </section>
          <LoadingComponent showLoader={isExporting} containerClassName={styles.exportLoaderContainer} contentClassName={styles.exportLoaderContent} loadingText="Generating PDF..." />
        </main>
      </div>
    </div>
  );
}

interface NavigationPanelProps {
  activeTab: Tab;
  changeTab: (newTab: Tab | "next" | "prev") => void;
  getTabIndex: (tab: Tab) => number;
}

function NavigationPanel({ activeTab, changeTab, getTabIndex }: NavigationPanelProps) {
  return (
    <>
      <div className={styles.paginationIndicator}>
        {TAB_ARRAY.map((tabItem) => (
          <div
            key={`dot-${tabItem.id}`}
            onClick={() => changeTab(tabItem.id)}
            className={`${styles.dot} ${activeTab === tabItem.id ? styles.active : ""}`}
          />
        ))}
      </div>
      <div className={styles.tabNavigation}>
        <Button size="sm" variant="outline" className={styles.previousButton} disabled={getTabIndex(activeTab) === 0} onClick={() => changeTab("prev")}>
          <ArrowLeft className={styles.tabNavigationIcon} />
          Previous
        </Button>
        <Button size="sm" className={styles.nextButton} disabled={getTabIndex(activeTab) === TAB_ARRAY.length - 1} onClick={() => changeTab("next")}>
          Next
          <ArrowRight className={styles.tabNavigationIcon} />
        </Button>
      </div>
    </>
  );
}
