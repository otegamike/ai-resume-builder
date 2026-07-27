"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronsUp, ChevronUp,
  Download, Eye, Image as ImageIcon, Save, Loader2, Check,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { buildTemplateSrcDoc, normalizeTemplateId } from "@/lib/templateRenderer";
import { TEMPLATE_PAGE, templateDefinitions, type TemplateDefinition, type TemplateId } from "@/lib/templateCatalog";
import { getRandomTemplateId } from "@/utils/templateUtils";
import styles from "./page.module.css";
import { calculateEditorHeight, editorSectionHeight } from "@/utils/headerSize";

function FormTabSkeleton() {
  return (
    <div className={styles.tabSkeleton}>
      <div className={styles.tabSkeletonField}>
        <div className={styles.tabSkeletonLabel} />
        <div className={styles.tabSkeletonInput} />
      </div>
      <div className={styles.tabSkeletonField}>
        <div className={styles.tabSkeletonLabel} />
        <div className={styles.tabSkeletonInput} />
      </div>
      <div className={styles.tabSkeletonField}>
        <div className={styles.tabSkeletonLabel} />
        <div className={styles.tabSkeletonInput} />
      </div>
      <div className={styles.tabSkeletonField}>
        <div className={styles.tabSkeletonLabel} />
        <div className={`${styles.tabSkeletonInput} ${styles.tabSkeletonInputShort}`} />
      </div>
    </div>
  );
}

const PersonalDetailsTab = dynamic(() => import("./form-nav/PersonalDetailsTab"), { ssr: false, loading: () => <FormTabSkeleton /> });
const HeadshotTab = dynamic(() => import("./form-nav/HeadshotTab"), { ssr: false, loading: () => <FormTabSkeleton /> });
const SummaryTab = dynamic(() => import("./form-nav/SummaryTab"), { ssr: false, loading: () => <FormTabSkeleton /> });
const ExperienceTab = dynamic(() => import("./form-nav/ExperienceTab"), { ssr: false, loading: () => <FormTabSkeleton /> });
const EducationTab = dynamic(() => import("./form-nav/EducationTab"), { ssr: false, loading: () => <FormTabSkeleton /> });
const ProjectsTab = dynamic(() => import("./form-nav/ProjectsTab"), { ssr: false, loading: () => <FormTabSkeleton /> });
const SkillsTab = dynamic(() => import("./form-nav/SkillsTab"), { ssr: false, loading: () => <FormTabSkeleton /> });
const FinishTab = dynamic(() => import("./form-nav/FinishTab"), { ssr: false, loading: () => <FormTabSkeleton /> });
const TemplateSelector = dynamic(() => import("./TemplateSelector"), { ssr: false });
const AdminPdfViewer = dynamic(() => import("@/components/resume/AdminPdfViewer"), { ssr: false });

import { useAi } from "@/app/hooks/useAi";
import { useAutoSave } from "@/app/hooks/useAutosave";
import { useResumeForm } from "@/app/hooks/useResumeForm";
import { useTabNavigation, TAB_ARRAY, type Tab } from "@/app/hooks/useTabNavigation";
import { exportResumeAsPdf, exportResumeAsImage } from "@/utils/exportUtils";
import { exportResumeAsAtsPdf } from "@/utils/atsExportUtils";
import { mapResumeToAtsView } from "@/lib/atsResumeMapper";
import { addRecentlyUsedTemplate } from "@/utils/templateStorage";
import type { ResumeContent } from "@/types/ResumeData";
import ResumeIframe from "@/components/resume/ResumeIframe";
import LoadingComponent from "@/components/ui/LoadingComponent";

export default function ResumeEditor() {
  const params = useParams();
  const searchParams = useSearchParams();
  const templateParams = searchParams.get("template");
  const { data: session, status } = useSession();

  const initialResumeId = params.id as string;
  const [title, setTitle] = useState("");

  const [isExporting, setIsExporting] = useState(false);
  const [templateDefinitions, setTemplateDefinitions] = useState<TemplateDefinition[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showExportOption, setShowExportOption] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const exportIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isEditorTabOpen, setIsEditorTabOpen] = useState(true);

  const {
    aiGenerating, aiGeneratingFor,
    generateAiSummary, improveAiSummary, generateAiSkills, generateAiCategorizedSkills, generateAiCategorizeExistingSkills, generateAiBulletPoints,
  } = useAi();

  const {
    resumeId, templateId, saving, autoSaveStatus,
    debouncedAutoSave, saveResume, updateTemplateId, setAutoSaveStatus,
  } = useAutoSave(initialResumeId, initialResumeId === "new" ? "template1" : "template1", 5000);

  const { activeTab, changeTab, getTabIndex } = useTabNavigation();

  const autoSaveChanges = useCallback((next: ResumeContent) => {
    if (resumeId !== "new") {
      setAutoSaveStatus("saving");
      debouncedAutoSave(title, next);
    }
  }, [resumeId, title, debouncedAutoSave, setAutoSaveStatus]);

  const form = useResumeForm(autoSaveChanges);
  const { resume, setResume, newSkill, setNewSkill, aiSuggestedSkills, setAiSuggestedSkills, skillsError, setSkillsError, formFilled } = form;

  const isFormFilled = useMemo(() => {
    return formFilled(activeTab);
  }, [formFilled, activeTab]);

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

  const atsViewData = useMemo(() => {
    if (!adminMode || !templateId.startsWith("ats-")) return null;
    return mapResumeToAtsView(resume);
  }, [adminMode, templateId, resume]);

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

  const generateCategorizedSkills = async () => {
    if (!resume.personalInfo.jobTitle) {
      setError("Please enter a job title first");
      return;
    }
    const result = await generateAiCategorizedSkills(resume.personalInfo.jobTitle);
    if (!result.success) return;
    
    // result.array should be an array of {category: string, skills: string[]}
    const newCategories = result.array as unknown as { category: string, skills: string[] }[];
    const formattedCategories = newCategories.map((c) => ({
      id: Date.now().toString() + Math.random().toString(),
      category: c.category,
      skills: c.skills,
    }));
    
    const nextResume = { ...resume, skillCategories: formattedCategories, skills: [], skillCategorized: true };
    setResume(nextResume); 
    debouncedAutoSave(title, nextResume);
  };

  const categorizeSkills = async () => {
    if (resume.skills.length === 0) return;

    const result = await generateAiCategorizeExistingSkills(resume.skills);
    if (!result.success) {
      const categories = [{ id: Date.now().toString(), category: "Core Skills", skills: [...resume.skills] }];
      const next = { ...resume, skillCategories: categories, skills: [], skillCategorized: true };
      setResume(next);
      debouncedAutoSave(title, next);
      return;
    }

    const newCategories = result.array as unknown as { category: string; skills: string[] }[];
    const allCategorized = newCategories.flatMap(c => c.skills);
    const missing = resume.skills.filter(s => !allCategorized.includes(s));
    if (missing.length > 0) {
      newCategories.push({ category: "Other", skills: missing });
    }

    const formattedCategories = newCategories.map(c => ({
      id: Date.now().toString() + Math.random().toString(),
      category: c.category,
      skills: c.skills,
    }));

    const nextResume = { ...resume, skillCategories: formattedCategories, skills: [], skillCategorized: true };
    setResume(nextResume);
    debouncedAutoSave(title, nextResume);
  };

  const uncategorizeSkills = () => {
    const flatSkills = (resume.skillCategories || []).flatMap(cat => cat.skills);
    const next = { ...resume, skills: flatSkills, skillCategories: [], skillCategorized: false };
    setResume(next);
    debouncedAutoSave(title, next);
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
        } else if (initialResumeId === "new") {
          updateTemplateId(getRandomTemplateId(data));
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
      if (templateId.startsWith("ats-")) {
        await exportResumeAsAtsPdf(title, resume, templateId);
      } else {
        await exportResumeAsPdf(exportIframeRef, title, TEMPLATE_PAGE.widthPx, TEMPLATE_PAGE.heightPx);
      }
    } catch (error) {
      console.error("Failed to export PDF:", error);
    } finally {
      setIsExporting(false);
    }
  }, [title, templateId, resume]);

  const exportImage = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportResumeAsImage(exportIframeRef, title);
    } catch (error) {
      console.error("Failed to export image:", error);
    } finally {
      setIsExporting(false);
    }
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
            userPlan={session?.user?.subscriptionPlan}
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

          {session?.user?.isAdmin && (
            <Button
              variant={adminMode ? "primary" : "light_outline"}
              size="sm"
              className={styles.adminBtn}
              onClick={() => setAdminMode((prev) => !prev)}
            >
              <Eye color={adminMode ? "var(--neutral-100)" : "var(--neutral-100)"} size={14} />
              <div className={styles.buttonText}>Admin</div>
            </Button>
          )}

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
              {activeTab === "projects" && (
                <ProjectsTab
                  projects={resume.projects || []}
                  addProject={form.addProject}
                  removeProject={form.removeProject}
                  onChange={form.handleProjectChange}
                />
              )}
              {activeTab === "skills" && (
                <SkillsTab
                  skills={resume.skills}
                  skillCategories={resume.skillCategories || []}
                  skillCategorized={resume.skillCategorized || false}
                  onCategorizeSkills={categorizeSkills}
                  onUncategorizeSkills={uncategorizeSkills}
                  updateSkillCategories={form.updateSkillCategories}
                  setSkills={(newSkills: string[]) => {
                    const nextResume = { ...resume, skills: newSkills };
                    setResume(nextResume);
                    debouncedAutoSave(title, nextResume);
                  }}
                  aiSuggestedSkills={aiSuggestedSkills}
                  jobTitle={resume.personalInfo.jobTitle}
                  newSkill={newSkill}
                  setNewSkill={setNewSkill}
                  addSkill={form.addSkill}
                  removeSkill={form.removeSkill}
                  addSkillFromSuggestion={form.addSkillFromSuggestion}
                  removeSuggestedSkill={form.removeSuggestedSkill}
                  generateAISkills={generateAISkills}
                  generateCategorizedSkills={generateCategorizedSkills}
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
                  <NavigationPanel changeTab={changeTab} activeTab={activeTab} getTabIndex={getTabIndex} formFilled={isFormFilled} />
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
            <div className={adminMode ? styles.adminSplit : styles.previewCanvas}>
              <div className={adminMode ? styles.adminPanel : ""}>
                {adminMode && <div className={styles.adminPanelLabel}>HTML Preview</div>}
                <ResumeIframe
                  iframeRef={previewIframeRef}
                  type="preview"
                  renderedTemplate={renderedTemplate}
                  editorMode={true}
                  loaderObj={{ showLoader, toggleShowLoader }}
                />
              </div>
              {adminMode && templateId.startsWith("ats-") && atsViewData && (
                <div className={styles.adminPanel}>
                  <div className={styles.adminPanelLabel}>React-PDF Output</div>
                  <AdminPdfViewer data={atsViewData} templateId={templateId} />
                </div>
              )}
            </div>
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
  formFilled?: boolean;
}

function NavigationPanel({ activeTab, changeTab, getTabIndex, formFilled }: NavigationPanelProps) {
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
          {formFilled ? "Next" : "Skip"}
          <ArrowRight className={styles.tabNavigationIcon} />
        </Button>
      </div>
    </>
  );
}
